"""
Agent Mesh Port - Interface for agent mesh communication

Defines the contract for inter-agent communication.
"""

from abc import ABC, abstractmethod
from typing import Optional, List, Dict, Any


class AgentMeshPort(ABC):
    """
    Port interface for agent mesh communication.

    Implementations handle message passing and collective memory.
    """

    @abstractmethod
    def send_message(
        self,
        to_agent_id: str,
        message_type: str,
        payload: Dict[str, Any],
    ) -> bool:
        """
        Send a message to another agent.

        Args:
            to_agent_id: Target agent identifier
            message_type: Type of message (notification, request, etc.)
            payload: Message payload data

        Returns:
            True if sent successfully, False otherwise
        """
        pass

    @abstractmethod
    def receive_messages(
        self,
    ) -> List[Dict[str, Any]]:
        """
        Receive pending messages for this agent.

        Returns:
            List of message dictionaries
        """
        pass

    @abstractmethod
    def contribute_knowledge(
        self,
        category: str,
        knowledge_data: Dict[str, Any],
    ) -> None:
        """
        Contribute knowledge to collective memory.

        Args:
            category: Knowledge category (best-practice, cross-agent-learning, etc.)
            knowledge_data: Knowledge data dictionary
        """
        pass

    @abstractmethod
    def search_knowledge(
        self,
        query: str,
        category: Optional[str] = None,
    ) -> List[Dict[str, Any]]:
        """
        Search collective memory for knowledge.

        Args:
            query: Search query string
            category: Optional category filter

        Returns:
            List of knowledge items
        """
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """
        Check if agent mesh is available.

        Returns:
            True if available, False otherwise
        """
        pass
