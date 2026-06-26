"""
AI-SDLC Cognitive Memory System
================================
4-layer memory architecture — the brain of the autonomous SDLC platform.

  Layer 1 — Working Memory   : Current session context (ephemeral, in-process)
  Layer 2 — Episodic Memory  : "What happened" — every event, decision, outcome
  Layer 3 — Semantic Memory  : "What I know" — facts, patterns, best practices
  Layer 4 — Procedural Memory: "How to do it" — reusable workflows, templates

Self-learning: after every project the LearningEngine automatically promotes
high-value episodic records into semantic/procedural memory, making the system
smarter with every build.

Storage: ChromaDB (vector search) + SQLite (structured queries). Both are
embedded — no external services required for local deployment.
"""
from __future__ import annotations

import hashlib, json, os, sqlite3, time, uuid
from dataclasses import asdict, dataclass, field
from datetime import datetime, timezone
from enum import Enum
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

import structlog

log = structlog.get_logger(__name__)


# ── Data Models ───────────────────────────────────────────────────────────────

class MemoryType(str, Enum):
    WORKING    = "working"
    EPISODIC   = "episodic"
    SEMANTIC   = "semantic"
    PROCEDURAL = "procedural"


class MemoryImportance(str, Enum):
    LOW      = "low"
    MEDIUM   = "medium"
    HIGH     = "high"
    CRITICAL = "critical"


@dataclass
class MemoryEntry:
    id:           str
    type:         MemoryType
    content:      str
    metadata:     Dict[str, Any]
    importance:   MemoryImportance       = MemoryImportance.MEDIUM
    tags:         List[str]              = field(default_factory=list)
    project_id:   Optional[str]         = None
    agent_id:     Optional[str]         = None
    created_at:   str                   = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    accessed_at:  str                   = field(default_factory=lambda: datetime.now(timezone.utc).isoformat())
    access_count: int                   = 0

    @classmethod
    def create(cls, type: MemoryType, content: str, metadata: Optional[Dict] = None,
               importance: MemoryImportance = MemoryImportance.MEDIUM,
               tags: Optional[List[str]] = None, project_id: Optional[str] = None,
               agent_id: Optional[str] = None) -> "MemoryEntry":
        return cls(id=str(uuid.uuid4()), type=type, content=content,
                   metadata=metadata or {}, importance=importance,
                   tags=tags or [], project_id=project_id, agent_id=agent_id)


@dataclass
class SearchResult:
    entry:    MemoryEntry
    score:    float
    distance: float


# ── Working Memory ────────────────────────────────────────────────────────────

class WorkingMemory:
    """Ephemeral in-process context for the current session."""

    def __init__(self, max_history: int = 200):
        self._store:   Dict[str, Any] = {}
        self._history: List[Dict]     = []
        self._max      = max_history

    def set(self, key: str, value: Any) -> None:   self._store[key] = value
    def get(self, key: str, default: Any = None):  return self._store.get(key, default)
    def delete(self, key: str) -> None:            self._store.pop(key, None)
    def all(self) -> Dict[str, Any]:               return dict(self._store)

    def push_history(self, role: str, content: str, meta: Optional[Dict] = None) -> None:
        self._history.append({"role": role, "content": content,
            "meta": meta or {}, "ts": datetime.now(timezone.utc).isoformat()})
        if len(self._history) > self._max:
            self._history = self._history[-self._max:]

    def history(self, last_n: int = 50) -> List[Dict]:
        return self._history[-last_n:]

    def clear(self) -> None:
        self._store.clear(); self._history.clear()

    def snapshot(self) -> Dict:
        return {"store": dict(self._store), "history": list(self._history)}


# ── Persistent Store Base ─────────────────────────────────────────────────────

class PersistentStore:
    """
    Shared base for Episodic, Semantic, and Procedural memory.
    Uses ChromaDB for vector search + SQLite for structured queries.
    Falls back gracefully when ChromaDB/embedder is unavailable.
    """

    def __init__(self, name: str, base: Path):
        self._name      = name
        self._base      = base / name
        self._base.mkdir(parents=True, exist_ok=True)
        self._db_path   = self._base / "store.db"
        self._chroma_path = self._base / "chroma"
        self._chroma    = None
        self._col       = None
        self._embedder  = None
        self._ready     = False

    def init(self) -> None:
        if self._ready: return
        self._init_sqlite()
        self._init_chroma()
        self._init_embedder()
        self._ready = True
        log.info("memory.store.ready", name=self._name)

    def _init_sqlite(self) -> None:
        c = sqlite3.connect(str(self._db_path))
        c.execute("""CREATE TABLE IF NOT EXISTS entries (
            id TEXT PRIMARY KEY, type TEXT, content TEXT, metadata TEXT,
            importance TEXT, tags TEXT, project_id TEXT, agent_id TEXT,
            created_at TEXT, accessed_at TEXT, access_count INTEGER DEFAULT 0)""")
        c.execute("CREATE INDEX IF NOT EXISTS i_type ON entries(type)")
        c.execute("CREATE INDEX IF NOT EXISTS i_proj ON entries(project_id)")
        c.execute("CREATE INDEX IF NOT EXISTS i_imp  ON entries(importance)")
        c.commit(); c.close()

    def _init_chroma(self) -> None:
        try:
            import chromadb
            self._chroma = chromadb.PersistentClient(path=str(self._chroma_path))
            self._col    = self._chroma.get_or_create_collection(
                name=self._name, metadata={"hnsw:space": "cosine"})
        except Exception as e:
            log.warning("memory.chroma.skip", name=self._name, reason=str(e))

    def _init_embedder(self) -> None:
        try:
            from sentence_transformers import SentenceTransformer
            self._embedder = SentenceTransformer("all-MiniLM-L6-v2")
        except Exception as e:
            log.warning("memory.embedder.skip", reason=str(e))

    def _embed(self, text: str) -> Optional[List[float]]:
        if not self._embedder: return None
        return self._embedder.encode(text, show_progress_bar=False).tolist()

    # ── CRUD ──────────────────────────────────────────────────────────────────

    def store(self, entry: MemoryEntry) -> str:
        if not self._ready: self.init()
        emb = self._embed(entry.content)
        c = sqlite3.connect(str(self._db_path))
        c.execute("""INSERT OR REPLACE INTO entries
            (id,type,content,metadata,importance,tags,project_id,agent_id,created_at,accessed_at,access_count)
            VALUES (?,?,?,?,?,?,?,?,?,?,?)""",
            (entry.id, entry.type.value, entry.content, json.dumps(entry.metadata),
             entry.importance.value, json.dumps(entry.tags), entry.project_id, entry.agent_id,
             entry.created_at, entry.accessed_at, entry.access_count))
        c.commit(); c.close()
        if self._col and emb:
            self._col.upsert(ids=[entry.id], embeddings=[emb], documents=[entry.content],
                metadatas=[{"type": entry.type.value, "importance": entry.importance.value,
                    "project_id": entry.project_id or "", "agent_id": entry.agent_id or "",
                    "tags": ",".join(entry.tags)}])
        return entry.id

    def search(self, query: str, n: int = 10, type_filter: Optional[MemoryType] = None,
               project_id: Optional[str] = None, min_score: float = 0.25) -> List[SearchResult]:
        if not self._ready: self.init()
        if not self._col or not self._embedder:
            return self._kw_search(query, n, type_filter, project_id)
        emb = self._embed(query)
        if not emb: return []
        where: Dict[str, Any] = {}
        if type_filter:  where["type"]       = type_filter.value
        if project_id:   where["project_id"] = project_id
        kw: Dict[str, Any] = {"query_embeddings": [emb],
            "n_results": min(n, max(1, self._col.count())),
            "include": ["documents", "metadatas", "distances"]}
        if where: kw["where"] = where
        try:
            res = self._col.query(**kw)
        except Exception as e:
            log.warning("memory.search.error", error=str(e)); return []
        out = []
        for i, doc_id in enumerate(res["ids"][0]):
            dist  = res["distances"][0][i]
            score = 1.0 - dist
            if score < min_score: continue
            entry = self._load(doc_id)
            if entry:
                self._touch(doc_id)
                out.append(SearchResult(entry=entry, score=score, distance=dist))
        out.sort(key=lambda r: r.score, reverse=True)
        return out

    def _kw_search(self, query: str, n: int, type_filter: Optional[MemoryType],
                   project_id: Optional[str]) -> List[SearchResult]:
        c = sqlite3.connect(str(self._db_path))
        where = ["content LIKE ?"]; params: List[Any] = [f"%{query}%"]
        if type_filter:  where.append("type = ?");       params.append(type_filter.value)
        if project_id:   where.append("project_id = ?"); params.append(project_id)
        params.append(n)
        rows = c.execute(f"SELECT * FROM entries WHERE {' AND '.join(where)} LIMIT ?", params).fetchall()
        c.close()
        return [SearchResult(entry=self._row(r), score=0.5, distance=0.5) for r in rows]

    def get(self, mid: str) -> Optional[MemoryEntry]:
        e = self._load(mid)
        if e: self._touch(mid)
        return e

    def delete(self, mid: str) -> None:
        c = sqlite3.connect(str(self._db_path))
        c.execute("DELETE FROM entries WHERE id = ?", (mid,)); c.commit(); c.close()
        if self._col:
            try: self._col.delete(ids=[mid])
            except: pass

    def recent(self, n: int = 20, type_filter: Optional[MemoryType] = None,
               project_id: Optional[str] = None) -> List[MemoryEntry]:
        if not self._ready: self.init()
        c = sqlite3.connect(str(self._db_path))
        where = []; params: List[Any] = []
        if type_filter:  where.append("type = ?");       params.append(type_filter.value)
        if project_id:   where.append("project_id = ?"); params.append(project_id)
        clause = f"WHERE {' AND '.join(where)}" if where else ""
        params.append(n)
        rows = c.execute(f"SELECT * FROM entries {clause} ORDER BY created_at DESC LIMIT ?", params).fetchall()
        c.close()
        return [self._row(r) for r in rows]

    def count(self) -> int:
        if not self._ready: self.init()
        c = sqlite3.connect(str(self._db_path))
        n = c.execute("SELECT COUNT(*) FROM entries").fetchone()[0]; c.close(); return n

    def _load(self, mid: str) -> Optional[MemoryEntry]:
        c = sqlite3.connect(str(self._db_path))
        r = c.execute("SELECT * FROM entries WHERE id = ?", (mid,)).fetchone(); c.close()
        return self._row(r) if r else None

    def _row(self, r: tuple) -> MemoryEntry:
        return MemoryEntry(id=r[0], type=MemoryType(r[1]), content=r[2],
            metadata=json.loads(r[3]), importance=MemoryImportance(r[4]),
            tags=json.loads(r[5]), project_id=r[6], agent_id=r[7],
            created_at=r[8], accessed_at=r[9], access_count=r[10])

    def _touch(self, mid: str) -> None:
        c = sqlite3.connect(str(self._db_path))
        c.execute("UPDATE entries SET accessed_at=?, access_count=access_count+1 WHERE id=?",
            (datetime.now(timezone.utc).isoformat(), mid)); c.commit(); c.close()


# ── Specialised Layers ────────────────────────────────────────────────────────

class EpisodicMemory(PersistentStore):
    """Records every SDLC event, decision, and outcome."""
    def __init__(self, base: Path): super().__init__("episodic", base)

    def record(self, event_type: str, description: str, project_id: Optional[str] = None,
               agent_id: Optional[str] = None, metadata: Optional[Dict] = None,
               importance: MemoryImportance = MemoryImportance.MEDIUM) -> str:
        e = MemoryEntry.create(MemoryType.EPISODIC,
            f"[{event_type}] {description}",
            metadata={**(metadata or {}), "event_type": event_type},
            importance=importance, tags=[event_type],
            project_id=project_id, agent_id=agent_id)
        return self.store(e)

    def project_history(self, project_id: str) -> List[MemoryEntry]:
        return self.recent(n=1000, project_id=project_id)


class SemanticMemory(PersistentStore):
    """Stores facts, best practices, patterns, and org standards."""
    def __init__(self, base: Path): super().__init__("semantic", base)

    def learn(self, topic: str, content: str, source: str = "learned",
              tags: Optional[List[str]] = None,
              importance: MemoryImportance = MemoryImportance.MEDIUM) -> str:
        e = MemoryEntry.create(MemoryType.SEMANTIC, f"[{topic}] {content}",
            metadata={"topic": topic, "source": source},
            importance=importance, tags=tags or [topic])
        return self.store(e)

    def recall(self, query: str, n: int = 5) -> List[str]:
        return [r.entry.content for r in self.search(query, n=n)]


class ProceduralMemory(PersistentStore):
    """Stores reusable workflows, code templates, and step-by-step procedures."""
    def __init__(self, base: Path): super().__init__("procedural", base)

    def store_procedure(self, name: str, description: str, steps: List[str],
                        template: Optional[str] = None, tags: Optional[List[str]] = None,
                        success_rate: float = 1.0) -> str:
        body = f"PROCEDURE: {name}\n{description}\n\nSteps:\n"
        body += "\n".join(f"{i+1}. {s}" for i, s in enumerate(steps))
        if template: body += f"\n\nTemplate:\n{template}"
        e = MemoryEntry.create(MemoryType.PROCEDURAL, body,
            metadata={"name": name, "steps": steps, "template": template, "success_rate": success_rate},
            importance=MemoryImportance.HIGH, tags=tags or [name])
        return self.store(e)

    def find(self, task: str) -> Optional[MemoryEntry]:
        r = self.search(task, n=1)
        return r[0].entry if r else None


# ── Unified Memory System ─────────────────────────────────────────────────────

class MemorySystem:
    """
    The unified cognitive memory system.
    Inject this into every agent for full memory capabilities.

    Usage:
        mem = MemorySystem()
        mem.semantic.learn("REST API", "Use noun-based URLs, not verbs.")
        mem.episodic.record("phase_complete", "Architecture done", project_id="p1")
        ctx = mem.build_context("authentication patterns", project_id="p1")
    """

    def __init__(self, data_dir: Optional[Path] = None):
        base = data_dir or Path(os.environ.get("AISDLC_DATA_DIR", "./data")) / "memory"
        base.mkdir(parents=True, exist_ok=True)
        self.working    = WorkingMemory()
        self.episodic   = EpisodicMemory(base)
        self.semantic   = SemanticMemory(base)
        self.procedural = ProceduralMemory(base)
        self._base      = base
        log.info("memory_system.created", dir=str(base))

    def init_all(self) -> None:
        for layer in [self.episodic, self.semantic, self.procedural]:
            layer.init()

    def search_all(self, query: str, n: int = 3,
                   project_id: Optional[str] = None) -> Dict[str, List[SearchResult]]:
        return {
            "episodic":   self.episodic.search(query,   n=n, project_id=project_id),
            "semantic":   self.semantic.search(query,   n=n),
            "procedural": self.procedural.search(query, n=n),
        }

    def build_context(self, query: str, project_id: Optional[str] = None,
                      max_tokens: int = 2000) -> str:
        """Build a rich context string for agent system prompt injection."""
        parts: List[str] = []
        budget = max_tokens * 4  # rough chars

        wm = self.working.snapshot()
        if wm["store"]:
            parts.append("## Active Session")
            for k, v in list(wm["store"].items())[:8]:
                parts.append(f"- {k}: {str(v)[:150]}")

        all_r = self.search_all(query, n=3, project_id=project_id)

        if all_r["semantic"]:
            parts.append("\n## Relevant Knowledge")
            for r in all_r["semantic"]:
                parts.append(f"- {r.entry.content[:300]}")

        if all_r["procedural"]:
            parts.append("\n## Applicable Procedures")
            for r in all_r["procedural"]:
                parts.append(f"- {r.entry.content[:400]}")

        if all_r["episodic"]:
            parts.append("\n## Recent Events")
            for r in all_r["episodic"]:
                parts.append(f"- {r.entry.content[:200]}")

        ctx = "\n".join(parts)
        return ctx[:budget] + "\n...[truncated]" if len(ctx) > budget else ctx

    def stats(self) -> Dict[str, Any]:
        return {
            "episodic":   self.episodic.count()   if self.episodic._ready   else 0,
            "semantic":   self.semantic.count()   if self.semantic._ready   else 0,
            "procedural": self.procedural.count() if self.procedural._ready else 0,
            "working_keys": len(self.working._store),
        }
