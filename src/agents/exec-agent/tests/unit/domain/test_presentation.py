"""
Unit tests for Presentation entity

Pure domain logic tests with no external dependencies.
"""

import sys
from pathlib import Path
from datetime import datetime

# Add parent directories to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from domain.entities.presentation import Presentation, PresentationType, PresentationStatus
from domain.entities.slide import Slide, SlideType, ContentLayout
from domain.entities.audience_profile import AudienceProfile, AudienceType, DetailLevel
from domain.entities.brand_config import BrandConfig


def test_presentation_create():
    """Test creating a presentation"""
    presentation = Presentation(
        id="test-pres-1",
        project_id="project-1",
        type=PresentationType.EXECUTIVE_SUMMARY,
        status=PresentationStatus.DRAFT,
        title="Test Presentation",
    )

    assert presentation.id == "test-pres-1"
    assert presentation.project_id == "project-1"
    assert presentation.type == PresentationType.EXECUTIVE_SUMMARY
    assert presentation.status == PresentationStatus.DRAFT
    assert presentation.title == "Test Presentation"
    assert len(presentation.slides) == 0


def test_presentation_add_slide():
    """Test adding slides to presentation"""
    presentation = Presentation(
        id="test-pres-1",
        project_id="project-1",
        type=PresentationType.EXECUTIVE_SUMMARY,
        status=PresentationStatus.DRAFT,
        title="Test Presentation",
    )

    slide = Slide(
        id="slide-1",
        type=SlideType.TITLE,
        layout=ContentLayout.TITLE_ONLY,
        title="Title Slide",
        order=0,
    )

    presentation.add_slide(slide)

    assert presentation.get_slide_count() == 1
    assert presentation.slides[0].id == "slide-1"


def test_presentation_get_slide_by_id():
    """Test retrieving slide by ID"""
    presentation = Presentation(
        id="test-pres-1",
        project_id="project-1",
        type=PresentationType.EXECUTIVE_SUMMARY,
        status=PresentationStatus.DRAFT,
        title="Test Presentation",
    )

    slide1 = Slide(
        id="slide-1",
        type=SlideType.TITLE,
        layout=ContentLayout.TITLE_ONLY,
        title="Title Slide",
        order=0,
    )

    slide2 = Slide(
        id="slide-2",
        type=SlideType.CONTENT,
        layout=ContentLayout.TITLE_CONTENT,
        title="Content Slide",
        order=1,
    )

    presentation.add_slide(slide1)
    presentation.add_slide(slide2)

    retrieved = presentation.get_slide_by_id("slide-2")
    assert retrieved is not None
    assert retrieved.id == "slide-2"
    assert retrieved.title == "Content Slide"


def test_presentation_remove_slide():
    """Test removing slide from presentation"""
    presentation = Presentation(
        id="test-pres-1",
        project_id="project-1",
        type=PresentationType.EXECUTIVE_SUMMARY,
        status=PresentationStatus.DRAFT,
        title="Test Presentation",
    )

    slide = Slide(
        id="slide-1",
        type=SlideType.TITLE,
        layout=ContentLayout.TITLE_ONLY,
        title="Title Slide",
        order=0,
    )

    presentation.add_slide(slide)
    assert presentation.get_slide_count() == 1

    removed = presentation.remove_slide("slide-1")
    assert removed is True
    assert presentation.get_slide_count() == 0


def test_presentation_mark_as_generated():
    """Test marking presentation as generated"""
    presentation = Presentation(
        id="test-pres-1",
        project_id="project-1",
        type=PresentationType.EXECUTIVE_SUMMARY,
        status=PresentationStatus.DRAFT,
        title="Test Presentation",
    )

    assert presentation.status == PresentationStatus.DRAFT

    presentation.mark_as_generated()
    assert presentation.status == PresentationStatus.GENERATED


def test_presentation_validate_empty():
    """Test validation of empty presentation"""
    presentation = Presentation(
        id="test-pres-1",
        project_id="project-1",
        type=PresentationType.EXECUTIVE_SUMMARY,
        status=PresentationStatus.DRAFT,
        title="Test Presentation",
    )

    errors = presentation.validate()
    assert len(errors) > 0  # Should have errors (no slides, no audience, no brand)
    assert not presentation.is_valid()


def test_presentation_validate_complete():
    """Test validation of complete presentation"""
    audience = AudienceProfile(
        id="c-suite",
        name="C-Suite",
        type=AudienceType.C_SUITE,
        detail_level=DetailLevel.MINIMAL,
    )

    brand = BrandConfig.create_deltek_brand()

    presentation = Presentation(
        id="test-pres-1",
        project_id="project-1",
        type=PresentationType.EXECUTIVE_SUMMARY,
        status=PresentationStatus.DRAFT,
        title="Test Presentation",
        audience_profile=audience,
        brand_config=brand,
    )

    slide = Slide(
        id="slide-1",
        type=SlideType.TITLE,
        layout=ContentLayout.TITLE_ONLY,
        title="Title Slide",
        order=0,
    )

    presentation.add_slide(slide)

    errors = presentation.validate()
    assert len(errors) == 0
    assert presentation.is_valid()


def test_presentation_reorder_slides():
    """Test reordering slides"""
    presentation = Presentation(
        id="test-pres-1",
        project_id="project-1",
        type=PresentationType.EXECUTIVE_SUMMARY,
        status=PresentationStatus.DRAFT,
        title="Test Presentation",
    )

    slide1 = Slide(id="slide-1", type=SlideType.TITLE, layout=ContentLayout.TITLE_ONLY, title="Slide 1", order=2)
    slide2 = Slide(id="slide-2", type=SlideType.CONTENT, layout=ContentLayout.TITLE_CONTENT, title="Slide 2", order=0)
    slide3 = Slide(id="slide-3", type=SlideType.CONTENT, layout=ContentLayout.TITLE_CONTENT, title="Slide 3", order=1)

    presentation.add_slide(slide1)
    presentation.add_slide(slide2)
    presentation.add_slide(slide3)

    # Before reordering
    assert presentation.slides[0].id == "slide-1"

    presentation.reorder_slides()

    # After reordering
    assert presentation.slides[0].id == "slide-2"
    assert presentation.slides[1].id == "slide-3"
    assert presentation.slides[2].id == "slide-1"


if __name__ == "__main__":
    # Run tests
    test_presentation_create()
    test_presentation_add_slide()
    test_presentation_get_slide_by_id()
    test_presentation_remove_slide()
    test_presentation_mark_as_generated()
    test_presentation_validate_empty()
    test_presentation_validate_complete()
    test_presentation_reorder_slides()

    print("All tests passed!")
