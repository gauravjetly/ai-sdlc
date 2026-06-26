"""
AI/ML Native Agents
====================
Five agents for building AI-native applications:

  1. MLPipelineAgent        — End-to-end ML pipeline design (data → training → serving)
  2. PromptEngineeringAgent — System prompt design, few-shot examples, chain-of-thought
  3. ModelEvalAgent         — LLM/ML model evaluation framework and benchmarking
  4. VectorDBAgent          — Vector database design, embedding strategies, RAG architecture
  5. AISafetyAgent          — Bias detection, fairness testing, safety guardrails, red-teaming
"""
from __future__ import annotations

import json
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional

import structlog

from aisdlc.core.base_agent import BaseAgent, AgentResult

log = structlog.get_logger(__name__)


# ── 1. ML Pipeline Agent ──────────────────────────────────────────────────────

@dataclass
class MLPipelineSpec:
    pipeline_id:  str
    name:         str
    problem_type: str       # "classification" | "regression" | "nlp" | "cv" | "rl"
    stages:       List[Dict[str, Any]]
    feature_store: Dict[str, Any]
    training_config: Dict[str, Any]
    serving_config: Dict[str, Any]
    monitoring_config: Dict[str, Any]


class MLPipelineAgent(BaseAgent):
    """
    Designs end-to-end ML pipelines:
    - Data ingestion and validation (Great Expectations)
    - Feature engineering and feature store (Feast)
    - Model training with experiment tracking (MLflow)
    - Hyperparameter optimization (Optuna)
    - Model registry and versioning
    - Serving infrastructure (Triton, BentoML, TorchServe)
    - Model monitoring (data drift, concept drift, performance degradation)
    - Retraining triggers (scheduled + drift-based)
    """

    AGENT_TYPE    = "ml_pipeline_agent"
    SYSTEM_PROMPT = """You are an MLOps engineer who builds production ML systems.
You design pipelines that are reproducible, scalable, and maintainable. You always:
- Validate data quality before training (Great Expectations)
- Track all experiments (MLflow, W&B)
- Version datasets, models, and features separately
- Design for online and batch serving
- Monitor for data drift and concept drift in production
- Automate retraining when model performance degrades
- Document model cards (capabilities, limitations, intended use)"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        problem_desc  = task.get("description", "")
        problem_type  = task.get("problem_type", "classification")
        data_sources  = task.get("data_sources", [])
        scale         = task.get("scale", "medium")  # small/medium/large/massive
        latency_req   = task.get("latency_ms", 100)

        prompt = f"""Design a complete, production-grade ML pipeline.

Problem: {problem_desc}
Problem Type: {problem_type}
Data Sources: {json.dumps(data_sources, default=str)[:500]}
Scale: {scale}
Latency Requirement: {latency_req}ms

Design:
1. Data ingestion pipeline (sources, frequency, validation rules)
2. Feature engineering (transformations, feature store schema)
3. Training pipeline (algorithm selection, hyperparameter space, CV strategy)
4. Experiment tracking configuration (MLflow/W&B)
5. Model evaluation framework (metrics, baselines, statistical tests)
6. Model registry workflow (staging → production promotion criteria)
7. Serving architecture (online vs batch, infrastructure, scaling)
8. Monitoring plan (data drift, concept drift, performance metrics)
9. Retraining triggers (drift threshold, schedule, performance degradation)
10. Model card template (capabilities, limitations, bias analysis)
11. Full Python code for the pipeline (using sklearn/PyTorch/TF as appropriate)
12. Kubeflow/Airflow DAG definition

Respond as JSON."""

        resp   = self.llm.complete(self.SYSTEM_PROMPT + "\n\n" + prompt,
                                    response_format="json")
        parsed = resp.get("parsed", {})

        pipeline = MLPipelineSpec(
            pipeline_id      = f"ml-pipeline-{uuid.uuid4().hex[:8]}",
            name             = parsed.get("name", problem_desc[:50]),
            problem_type     = problem_type,
            stages           = parsed.get("stages", []),
            feature_store    = parsed.get("feature_store", {}),
            training_config  = parsed.get("training_config", {}),
            serving_config   = parsed.get("serving_config", {}),
            monitoring_config = parsed.get("monitoring_config", {}),
        )

        arts = self._write_pipeline(parsed, task.get("workspace", "."))

        return AgentResult(
            agent_type  = self.AGENT_TYPE,
            success     = bool(parsed),
            output      = {
                "pipeline_id":   pipeline.pipeline_id,
                "stages":        len(pipeline.stages),
                "problem_type":  problem_type,
                "serving_type":  pipeline.serving_config.get("type", "online"),
                "monitoring":    bool(pipeline.monitoring_config),
            },
            artifacts   = arts,
            tokens_used = resp.get("tokens_used", 0),
            cost_usd    = resp.get("cost_usd", 0.0),
        )

    def _write_pipeline(self, spec: Dict, workspace: str) -> List[str]:
        import os
        arts   = []
        ml_dir = os.path.join(workspace, "ml_pipeline")
        os.makedirs(ml_dir, exist_ok=True)

        for key in ["pipeline_code", "dag_definition", "feature_definitions",
                    "model_card", "monitoring_config"]:
            if key in spec and isinstance(spec[key], str):
                ext  = ".py" if "code" in key or "dag" in key else (
                       ".yaml" if "config" in key or "dag" in key else ".md")
                path = os.path.join(ml_dir, f"{key}{ext}")
                with open(path, "w") as f:
                    f.write(spec[key])
                arts.append(path)

        return arts


# ── 2. Prompt Engineering Agent ───────────────────────────────────────────────

@dataclass
class PromptDesign:
    prompt_id:      str
    name:           str
    system_prompt:  str
    few_shot_examples: List[Dict[str, str]]
    chain_of_thought: str
    output_format:  str
    guardrails:     List[str]
    test_cases:     List[Dict[str, Any]]
    eval_criteria:  List[str]


class PromptEngineeringAgent(BaseAgent):
    """
    Designs optimized prompts for LLM-powered features:
    - System prompt design with role, context, constraints
    - Few-shot example selection and formatting
    - Chain-of-thought reasoning templates
    - Output format specification (JSON schema, structured output)
    - Prompt injection defense
    - Prompt versioning and A/B testing
    - Automatic prompt optimization (DSPy-style)
    """

    AGENT_TYPE    = "prompt_engineering_agent"
    SYSTEM_PROMPT = """You are a prompt engineering expert. You design prompts that
reliably produce high-quality outputs from LLMs. You always:
- Write system prompts with clear role, context, and constraints
- Use few-shot examples that cover edge cases, not just happy paths
- Apply chain-of-thought for complex reasoning tasks
- Specify output format precisely (JSON schema preferred)
- Include guardrails against prompt injection and jailbreaking
- Design prompts that are model-agnostic (work across GPT, Claude, Gemini)
- Write evaluation criteria to measure prompt quality objectively"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        feature_desc  = task.get("description", "")
        output_type   = task.get("output_type", "json")
        model_family  = task.get("model_family", "any")
        examples      = task.get("examples", [])

        prompt = f"""Design a complete, production-ready prompt for this LLM feature.

Feature: {feature_desc}
Output Type: {output_type}
Target Model Family: {model_family}
Example Inputs/Outputs: {json.dumps(examples, default=str)[:800]}

Design:
1. System prompt (role, expertise, behavior constraints, output format)
2. 5 few-shot examples (covering happy path, edge cases, error cases)
3. Chain-of-thought template (step-by-step reasoning structure)
4. Output JSON schema (if structured output required)
5. Prompt injection defense (instructions to ignore adversarial inputs)
6. 10 test cases (input → expected output → evaluation criteria)
7. Evaluation rubric (how to score prompt quality 1-5)
8. Alternative prompt variants (for A/B testing)
9. Model-specific adaptations (GPT vs Claude vs Gemini differences)
10. Prompt versioning strategy (how to evolve the prompt safely)

Respond as JSON."""

        resp   = self.llm.complete(self.SYSTEM_PROMPT + "\n\n" + prompt,
                                    response_format="json")
        parsed = resp.get("parsed", {})

        design = PromptDesign(
            prompt_id          = f"prompt-{uuid.uuid4().hex[:8]}",
            name               = feature_desc[:60],
            system_prompt      = parsed.get("system_prompt", ""),
            few_shot_examples  = parsed.get("few_shot_examples", []),
            chain_of_thought   = parsed.get("chain_of_thought", ""),
            output_format      = parsed.get("output_schema", ""),
            guardrails         = parsed.get("guardrails", []),
            test_cases         = parsed.get("test_cases", []),
            eval_criteria      = parsed.get("eval_criteria", []),
        )

        return AgentResult(
            agent_type  = self.AGENT_TYPE,
            success     = bool(design.system_prompt),
            output      = {
                "prompt_id":         design.prompt_id,
                "system_prompt":     design.system_prompt,
                "few_shot_count":    len(design.few_shot_examples),
                "test_cases_count":  len(design.test_cases),
                "guardrails":        design.guardrails,
                "variants":          parsed.get("variants", []),
                "eval_rubric":       parsed.get("eval_rubric", ""),
            },
            artifacts   = [],
            tokens_used = resp.get("tokens_used", 0),
            cost_usd    = resp.get("cost_usd", 0.0),
        )


# ── 3. Model Evaluation Agent ─────────────────────────────────────────────────

@dataclass
class EvalResult:
    eval_id:     str
    model:       str
    task:        str
    metrics:     Dict[str, float]
    passed:      bool
    baseline:    Dict[str, float]
    improvement: Dict[str, float]
    failures:    List[Dict[str, Any]]
    recommendation: str


class ModelEvalAgent(BaseAgent):
    """
    LLM/ML model evaluation framework:
    - Task-specific benchmarks (accuracy, F1, BLEU, ROUGE, etc.)
    - LLM-specific evaluations (faithfulness, relevance, coherence)
    - Regression testing (new model vs production model)
    - Latency and cost benchmarking
    - Adversarial robustness testing
    - Human preference evaluation design
    """

    AGENT_TYPE    = "model_eval_agent"
    SYSTEM_PROMPT = """You are an ML evaluation engineer. You design rigorous
evaluation frameworks that prevent regressions and measure real-world quality.
You always:
- Define task-specific metrics (not just accuracy)
- Test on held-out data that represents production distribution
- Include adversarial examples in the test set
- Measure latency and cost alongside quality
- Design human evaluation studies for subjective quality
- Set minimum quality thresholds for production promotion
- Track metrics over time to detect degradation"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        model_desc    = task.get("model", task.get("description", ""))
        task_type     = task.get("task_type", "text_generation")
        test_data     = task.get("test_data", [])
        baseline      = task.get("baseline_metrics", {})
        quality_gates = task.get("quality_gates", {})

        prompt = f"""Design a comprehensive model evaluation framework.

Model/System: {model_desc}
Task Type: {task_type}
Baseline Metrics: {json.dumps(baseline, default=str)[:500]}
Quality Gates: {json.dumps(quality_gates, default=str)[:300]}
Test Data Sample: {json.dumps(test_data[:3], default=str)[:500]}

Design:
1. Evaluation metrics (primary + secondary, with formulas)
2. Test dataset requirements (size, distribution, edge cases)
3. Automated evaluation pipeline (code)
4. LLM-as-judge evaluation (faithfulness, relevance, coherence prompts)
5. Adversarial test cases (prompt injection, out-of-distribution inputs)
6. Latency benchmarking methodology (p50, p95, p99)
7. Cost benchmarking (tokens per task, cost per 1000 requests)
8. Human evaluation study design (if needed)
9. Quality gates for production promotion
10. Regression test suite (prevent quality degradation)
11. Evaluation report template

Respond as JSON."""

        resp   = self.llm.complete(self.SYSTEM_PROMPT + "\n\n" + prompt,
                                    response_format="json")
        parsed = resp.get("parsed", {})

        return AgentResult(
            agent_type  = self.AGENT_TYPE,
            success     = bool(parsed),
            output      = parsed,
            artifacts   = [],
            tokens_used = resp.get("tokens_used", 0),
            cost_usd    = resp.get("cost_usd", 0.0),
        )


# ── 4. Vector Database Design Agent ──────────────────────────────────────────

@dataclass
class VectorDBDesign:
    design_id:        str
    database:         str         # "pgvector" | "qdrant" | "pinecone" | "weaviate" | "chroma"
    embedding_model:  str
    index_type:       str         # "hnsw" | "ivf" | "flat"
    dimensions:       int
    collections:      List[Dict[str, Any]]
    retrieval_strategy: str
    hybrid_search:    bool
    reranking:        bool


class VectorDBAgent(BaseAgent):
    """
    Designs vector database architecture for RAG and semantic search:
    - Embedding model selection (OpenAI, Cohere, local models)
    - Index type selection (HNSW vs IVF vs Flat)
    - Collection/namespace design
    - Chunking strategies for documents
    - Hybrid search (vector + keyword)
    - Reranking pipeline
    - Metadata filtering design
    - Multi-tenancy in vector stores
    """

    AGENT_TYPE    = "vector_db_agent"
    SYSTEM_PROMPT = """You are a vector database and RAG architecture expert.
You design retrieval systems that find the right information reliably. You always:
- Select embedding models based on domain and language requirements
- Choose index types based on dataset size and query latency requirements
- Design chunking strategies that preserve semantic context
- Implement hybrid search (vector + BM25) for better recall
- Add reranking to improve precision
- Design metadata schemas for efficient filtering
- Plan for index updates (real-time vs batch)
- Benchmark retrieval quality (recall@k, MRR, NDCG)"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        use_case      = task.get("use_case", task.get("description", ""))
        data_types    = task.get("data_types", ["text"])
        scale         = task.get("scale", "medium")
        latency_req   = task.get("latency_ms", 100)
        languages     = task.get("languages", ["english"])

        prompt = f"""Design a complete vector database architecture for this use case.

Use Case: {use_case}
Data Types: {data_types}
Scale: {scale}
Latency Requirement: {latency_req}ms
Languages: {languages}

Design:
1. Database selection (pgvector/Qdrant/Pinecone/Weaviate/Chroma with justification)
2. Embedding model selection (with benchmark comparison)
3. Index type (HNSW vs IVF vs Flat, with parameters)
4. Chunking strategy (size, overlap, semantic vs fixed)
5. Collection/namespace schema (with metadata fields)
6. Hybrid search configuration (vector + BM25 weights)
7. Reranking pipeline (cross-encoder model selection)
8. Multi-tenancy design (tenant isolation in vector store)
9. Ingestion pipeline (batch + real-time update strategies)
10. Retrieval quality benchmarking plan (recall@k, MRR)
11. Complete Python implementation code (ingestion + retrieval)
12. Performance optimization (caching, approximate search tuning)

Respond as JSON."""

        resp   = self.llm.complete(self.SYSTEM_PROMPT + "\n\n" + prompt,
                                    response_format="json")
        parsed = resp.get("parsed", {})

        design = VectorDBDesign(
            design_id          = f"vdb-{uuid.uuid4().hex[:8]}",
            database           = parsed.get("database", "qdrant"),
            embedding_model    = parsed.get("embedding_model", "text-embedding-3-small"),
            index_type         = parsed.get("index_type", "hnsw"),
            dimensions         = int(parsed.get("dimensions", 1536)),
            collections        = parsed.get("collections", []),
            retrieval_strategy = parsed.get("retrieval_strategy", "hybrid"),
            hybrid_search      = parsed.get("hybrid_search", True),
            reranking          = parsed.get("reranking", True),
        )

        return AgentResult(
            agent_type  = self.AGENT_TYPE,
            success     = bool(parsed),
            output      = {
                "design_id":         design.design_id,
                "database":          design.database,
                "embedding_model":   design.embedding_model,
                "index_type":        design.index_type,
                "dimensions":        design.dimensions,
                "collections":       design.collections,
                "hybrid_search":     design.hybrid_search,
                "reranking":         design.reranking,
                "implementation":    parsed.get("implementation_code", ""),
                "benchmarks":        parsed.get("benchmarks", {}),
            },
            artifacts   = [],
            tokens_used = resp.get("tokens_used", 0),
            cost_usd    = resp.get("cost_usd", 0.0),
        )


# ── 5. AI Safety Agent ────────────────────────────────────────────────────────

@dataclass
class SafetyFinding:
    category:    str        # "bias" | "toxicity" | "hallucination" | "privacy" | "security"
    severity:    str        # "critical" | "high" | "medium" | "low"
    description: str
    evidence:    List[str]
    remediation: str
    test_cases:  List[str]


@dataclass
class AISafetyReport:
    report_id:   str
    model:       str
    findings:    List[SafetyFinding]
    bias_score:  float      # 0 (no bias) – 1 (severe bias)
    safety_score: float     # 0 (unsafe) – 1 (safe)
    approved:    bool
    guardrails:  List[str]
    red_team_scenarios: List[str]


class AISafetyAgent(BaseAgent):
    """
    AI safety and responsible AI enforcement:
    - Bias detection across demographic groups
    - Fairness metrics (demographic parity, equalized odds)
    - Toxicity and harmful content detection
    - Hallucination rate measurement
    - Privacy leakage testing (PII in model outputs)
    - Red-teaming scenarios
    - Guardrail implementation (input/output filters)
    - Model card generation (capabilities, limitations, intended use)
    """

    AGENT_TYPE    = "ai_safety_agent"
    SYSTEM_PROMPT = """You are an AI safety researcher and responsible AI engineer.
You ensure AI systems are safe, fair, and trustworthy. You always:
- Test for bias across protected characteristics (gender, race, age, etc.)
- Measure fairness with multiple metrics (not just accuracy)
- Red-team the system with adversarial prompts
- Test for hallucination and factual accuracy
- Check for PII leakage in model outputs
- Design guardrails that are robust to adversarial bypass
- Write model cards that honestly describe limitations
- Apply the precautionary principle (if unsure, flag for human review)"""

    def _execute(self, task: Dict[str, Any], context: Dict[str, Any]) -> AgentResult:
        model_desc    = task.get("model", task.get("description", ""))
        use_case      = task.get("use_case", "")
        user_groups   = task.get("user_groups", ["general_public"])
        risk_level    = task.get("risk_level", "medium")

        prompt = f"""Conduct a comprehensive AI safety assessment.

Model/System: {model_desc}
Use Case: {use_case}
User Groups: {user_groups}
Risk Level: {risk_level}

Assess:
1. Bias analysis (test prompts for gender, race, age, nationality bias)
2. Fairness metrics (demographic parity, equalized odds, calibration)
3. Toxicity testing (harmful content generation scenarios)
4. Hallucination testing (factual accuracy, citation verification)
5. Privacy leakage testing (PII extraction attempts)
6. Red-team scenarios (jailbreaking, prompt injection, adversarial inputs)
7. Guardrail recommendations (input filters, output filters, content policies)
8. Model card (capabilities, limitations, intended use, out-of-scope use)
9. Monitoring plan (ongoing bias/safety monitoring in production)
10. Incident response for AI safety violations
11. Regulatory compliance (EU AI Act risk classification)

For each finding: category, severity, description, evidence, remediation, test cases.

Respond as JSON."""

        resp   = self.llm.complete(self.SYSTEM_PROMPT + "\n\n" + prompt,
                                    response_format="json")
        parsed = resp.get("parsed", {})

        findings = [
            SafetyFinding(
                category    = f.get("category", ""),
                severity    = f.get("severity", "medium"),
                description = f.get("description", ""),
                evidence    = f.get("evidence", []),
                remediation = f.get("remediation", ""),
                test_cases  = f.get("test_cases", []),
            )
            for f in parsed.get("findings", [])
        ]

        critical = sum(1 for f in findings if f.severity == "critical")
        high     = sum(1 for f in findings if f.severity == "high")

        report = AISafetyReport(
            report_id           = f"safety-{uuid.uuid4().hex[:8]}",
            model               = model_desc[:100],
            findings            = findings,
            bias_score          = parsed.get("bias_score", 0.0),
            safety_score        = parsed.get("safety_score", 0.8),
            approved            = critical == 0 and high <= 1,
            guardrails          = parsed.get("guardrails", []),
            red_team_scenarios  = parsed.get("red_team_scenarios", []),
        )

        return AgentResult(
            agent_type  = self.AGENT_TYPE,
            success     = True,
            output      = {
                "report_id":          report.report_id,
                "approved":           report.approved,
                "bias_score":         report.bias_score,
                "safety_score":       report.safety_score,
                "critical_findings":  critical,
                "high_findings":      high,
                "findings":           [f.__dict__ for f in findings],
                "guardrails":         report.guardrails,
                "red_team_scenarios": report.red_team_scenarios,
                "model_card":         parsed.get("model_card", ""),
                "eu_ai_act_class":    parsed.get("eu_ai_act_classification", ""),
                "monitoring_plan":    parsed.get("monitoring_plan", {}),
            },
            artifacts   = [],
            tokens_used = resp.get("tokens_used", 0),
            cost_usd    = resp.get("cost_usd", 0.0),
        )
