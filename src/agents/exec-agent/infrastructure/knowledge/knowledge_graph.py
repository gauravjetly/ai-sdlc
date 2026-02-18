"""
Knowledge Graph

Shared knowledge store across all agents in the mesh.
"""

import json
import os
from typing import Dict, List, Optional, Any
from datetime import datetime
from pathlib import Path


class KnowledgeGraph:
    """
    Shared knowledge graph for the agent mesh.

    Stores entities and relationships for cross-agent learning.
    """

    def __init__(self, storage_path: Optional[str] = None):
        """
        Initialize the knowledge graph.

        Args:
            storage_path: Optional path to storage directory
        """
        if storage_path is None:
            home = str(Path.home())
            storage_path = os.path.join(
                home, '.claude', 'agent-mesh', 'knowledge'
            )

        self.storage_path = storage_path
        os.makedirs(self.storage_path, exist_ok=True)

        # In-memory graph (entity_id -> entity data)
        self.entities: Dict[str, Dict] = {}
        self.relationships: List[Dict] = []

        # Load existing graph
        self._load_graph()

    def add_entity(
        self,
        entity_type: str,
        entity_id: str,
        attributes: Dict,
    ) -> None:
        """
        Add or update a knowledge entity.

        Args:
            entity_type: Type of entity (project, architecture, presentation, etc.)
            entity_id: Unique identifier
            attributes: Entity attributes
        """
        entity_key = f"{entity_type}:{entity_id}"

        self.entities[entity_key] = {
            'type': entity_type,
            'id': entity_id,
            'attributes': attributes,
            'created_at': datetime.now().isoformat(),
            'updated_at': datetime.now().isoformat(),
        }

        self._save_graph()

    def add_relationship(
        self,
        from_id: str,
        relation: str,
        to_id: str,
        attributes: Optional[Dict] = None,
    ) -> None:
        """
        Add a relationship between entities.

        Args:
            from_id: Source entity ID (type:id format)
            relation: Relationship type (e.g., "has_architecture", "generated_for")
            to_id: Target entity ID (type:id format)
            attributes: Optional relationship attributes
        """
        relationship = {
            'from': from_id,
            'relation': relation,
            'to': to_id,
            'attributes': attributes or {},
            'created_at': datetime.now().isoformat(),
        }

        self.relationships.append(relationship)
        self._save_graph()

    def get_entity(self, entity_key: str) -> Optional[Dict]:
        """
        Get an entity by key.

        Args:
            entity_key: Entity key in format "type:id"

        Returns:
            Entity data or None if not found
        """
        return self.entities.get(entity_key)

    def get_relationships(
        self,
        from_id: Optional[str] = None,
        relation: Optional[str] = None,
        to_id: Optional[str] = None,
    ) -> List[Dict]:
        """
        Query relationships.

        Args:
            from_id: Optional filter by source entity
            relation: Optional filter by relation type
            to_id: Optional filter by target entity

        Returns:
            List of matching relationships
        """
        results = []

        for rel in self.relationships:
            if from_id and rel['from'] != from_id:
                continue
            if relation and rel['relation'] != relation:
                continue
            if to_id and rel['to'] != to_id:
                continue

            results.append(rel)

        return results

    def query(self, pattern: Dict) -> List[Dict]:
        """
        Query entities matching a pattern.

        Args:
            pattern: Dictionary with query criteria
                    e.g., {'type': 'presentation', 'attributes.project_id': 'PROJ-123'}

        Returns:
            List of matching entities
        """
        results = []

        for entity_key, entity in self.entities.items():
            if self._matches_pattern(entity, pattern):
                results.append(entity)

        return results

    def _matches_pattern(self, entity: Dict, pattern: Dict) -> bool:
        """Check if entity matches query pattern"""
        for key, value in pattern.items():
            # Handle nested keys (e.g., 'attributes.project_id')
            if '.' in key:
                parts = key.split('.')
                current = entity
                for part in parts:
                    if isinstance(current, dict) and part in current:
                        current = current[part]
                    else:
                        return False
                if current != value:
                    return False
            else:
                # Simple key
                if key not in entity or entity[key] != value:
                    return False

        return True

    def export_for_agent(self, agent_name: str) -> Dict:
        """
        Export agent-relevant knowledge subset.

        Args:
            agent_name: Name of the agent

        Returns:
            Dictionary with relevant entities and relationships
        """
        # For now, export everything
        # In full implementation: filter based on agent_name
        return {
            'entities': self.entities,
            'relationships': self.relationships,
            'exported_at': datetime.now().isoformat(),
            'for_agent': agent_name,
        }

    def _load_graph(self) -> None:
        """Load knowledge graph from disk"""
        graph_file = os.path.join(self.storage_path, 'graph.json')

        if os.path.exists(graph_file):
            try:
                with open(graph_file, 'r') as f:
                    data = json.load(f)
                    self.entities = data.get('entities', {})
                    self.relationships = data.get('relationships', [])
            except Exception as e:
                print(f"Warning: Failed to load knowledge graph: {e}")

    def _save_graph(self) -> None:
        """Save knowledge graph to disk"""
        graph_file = os.path.join(self.storage_path, 'graph.json')

        try:
            data = {
                'entities': self.entities,
                'relationships': self.relationships,
                'saved_at': datetime.now().isoformat(),
            }

            with open(graph_file, 'w') as f:
                json.dump(data, f, indent=2)

        except Exception as e:
            print(f"Warning: Failed to save knowledge graph: {e}")

    def get_stats(self) -> Dict:
        """Get knowledge graph statistics"""
        entity_types = {}
        for entity in self.entities.values():
            entity_type = entity['type']
            entity_types[entity_type] = entity_types.get(entity_type, 0) + 1

        relation_types = {}
        for rel in self.relationships:
            relation_type = rel['relation']
            relation_types[relation_type] = relation_types.get(relation_type, 0) + 1

        return {
            'total_entities': len(self.entities),
            'total_relationships': len(self.relationships),
            'entity_types': entity_types,
            'relation_types': relation_types,
        }
