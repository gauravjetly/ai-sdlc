"""Domain entities for the Exec Agent"""

from .presentation import Presentation, PresentationStatus, PresentationType
from .slide import Slide, SlideType, ContentLayout
from .diagram import Diagram, DiagramType, DiagramStyle
from .audience_profile import AudienceProfile, AudienceType, DetailLevel
from .brand_config import BrandConfig

__all__ = [
    "Presentation",
    "PresentationStatus",
    "PresentationType",
    "Slide",
    "SlideType",
    "ContentLayout",
    "Diagram",
    "DiagramType",
    "DiagramStyle",
    "AudienceProfile",
    "AudienceType",
    "DetailLevel",
    "BrandConfig",
]
