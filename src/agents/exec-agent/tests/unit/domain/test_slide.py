"""
Unit tests for Slide entity

Pure domain logic tests with no external dependencies.
"""

import sys
from pathlib import Path

# Add parent directories to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from domain.entities.slide import Slide, SlideType, ContentLayout


def test_slide_create():
    """Test creating a slide"""
    slide = Slide(
        id="slide-1",
        type=SlideType.CONTENT,
        layout=ContentLayout.TITLE_CONTENT,
        title="Test Slide",
        order=0,
    )

    assert slide.id == "slide-1"
    assert slide.type == SlideType.CONTENT
    assert slide.layout == ContentLayout.TITLE_CONTENT
    assert slide.title == "Test Slide"
    assert slide.order == 0
    assert len(slide.diagrams) == 0
    assert len(slide.content) == 0


def test_slide_set_bullet_points():
    """Test setting bullet points"""
    slide = Slide(
        id="slide-1",
        type=SlideType.CONTENT,
        layout=ContentLayout.TITLE_CONTENT,
        title="Test Slide",
        order=0,
    )

    points = ["Point 1", "Point 2", "Point 3"]
    slide.set_bullet_points(points)

    retrieved = slide.get_bullet_points()
    assert retrieved == points
    assert len(retrieved) == 3


def test_slide_set_and_get_content():
    """Test setting and getting content"""
    slide = Slide(
        id="slide-1",
        type=SlideType.CONTENT,
        layout=ContentLayout.TITLE_CONTENT,
        title="Test Slide",
        order=0,
    )

    slide.set_content("custom_field", "custom value")
    assert slide.get_content("custom_field") == "custom value"
    assert slide.get_content("missing_field", "default") == "default"


def test_slide_set_metrics():
    """Test setting metrics"""
    slide = Slide(
        id="slide-1",
        type=SlideType.KEY_METRICS,
        layout=ContentLayout.GRID,
        title="Metrics Slide",
        order=0,
    )

    metrics = {
        "Total Users": 1000,
        "Active Users": 750,
        "Conversion Rate": "75%",
    }

    slide.set_metrics(metrics)

    retrieved = slide.get_metrics()
    assert retrieved == metrics
    assert retrieved["Total Users"] == 1000


def test_slide_headline():
    """Test setting and getting headline"""
    slide = Slide(
        id="slide-1",
        type=SlideType.CONTENT,
        layout=ContentLayout.TITLE_CONTENT,
        title="Test Slide",
        order=0,
    )

    slide.set_headline("This is a headline")
    assert slide.get_headline() == "This is a headline"


def test_slide_narrative():
    """Test setting and getting narrative"""
    slide = Slide(
        id="slide-1",
        type=SlideType.CONTENT,
        layout=ContentLayout.TITLE_CONTENT,
        title="Test Slide",
        order=0,
    )

    narrative = "This is a longer narrative text that provides context."
    slide.set_narrative(narrative)
    assert slide.get_narrative() == narrative


def test_slide_validate_valid():
    """Test validation of valid slide"""
    slide = Slide(
        id="slide-1",
        type=SlideType.CONTENT,
        layout=ContentLayout.TITLE_CONTENT,
        title="Test Slide",
        order=0,
        relevance_score=0.8,
    )

    errors = slide.validate()
    assert len(errors) == 0
    assert slide.is_valid()


def test_slide_validate_missing_title():
    """Test validation of slide with missing title"""
    slide = Slide(
        id="slide-1",
        type=SlideType.CONTENT,
        layout=ContentLayout.TITLE_CONTENT,
        title="",  # Empty title
        order=0,
    )

    errors = slide.validate()
    assert len(errors) > 0
    assert not slide.is_valid()


def test_slide_validate_negative_order():
    """Test validation of slide with negative order"""
    slide = Slide(
        id="slide-1",
        type=SlideType.CONTENT,
        layout=ContentLayout.TITLE_CONTENT,
        title="Test Slide",
        order=-1,  # Negative order
    )

    errors = slide.validate()
    assert len(errors) > 0
    assert not slide.is_valid()


def test_slide_validate_invalid_relevance_score():
    """Test validation of slide with invalid relevance score"""
    slide = Slide(
        id="slide-1",
        type=SlideType.CONTENT,
        layout=ContentLayout.TITLE_CONTENT,
        title="Test Slide",
        order=0,
        relevance_score=1.5,  # > 1.0
    )

    errors = slide.validate()
    assert len(errors) > 0
    assert not slide.is_valid()


if __name__ == "__main__":
    # Run tests
    test_slide_create()
    test_slide_set_bullet_points()
    test_slide_set_and_get_content()
    test_slide_set_metrics()
    test_slide_headline()
    test_slide_narrative()
    test_slide_validate_valid()
    test_slide_validate_missing_title()
    test_slide_validate_negative_order()
    test_slide_validate_invalid_relevance_score()

    print("All tests passed!")
