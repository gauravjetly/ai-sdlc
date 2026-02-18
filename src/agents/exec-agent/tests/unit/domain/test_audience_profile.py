"""
Unit tests for AudienceProfile entity

Pure domain logic tests with no external dependencies.
"""

import sys
from pathlib import Path

# Add parent directories to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent.parent.parent))

from domain.entities.audience_profile import AudienceProfile, AudienceType, DetailLevel


def test_audience_profile_create():
    """Test creating an audience profile"""
    profile = AudienceProfile(
        id="test-audience",
        name="Test Audience",
        type=AudienceType.C_SUITE,
        detail_level=DetailLevel.MINIMAL,
        technical_depth=0.2,
    )

    assert profile.id == "test-audience"
    assert profile.name == "Test Audience"
    assert profile.type == AudienceType.C_SUITE
    assert profile.detail_level == DetailLevel.MINIMAL
    assert profile.technical_depth == 0.2


def test_audience_is_technical():
    """Test technical audience check"""
    tech_profile = AudienceProfile(
        id="tech",
        name="Technical",
        type=AudienceType.TECHNICAL_LEAD,
        detail_level=DetailLevel.DETAILED,
    )

    exec_profile = AudienceProfile(
        id="exec",
        name="Executive",
        type=AudienceType.C_SUITE,
        detail_level=DetailLevel.MINIMAL,
    )

    assert tech_profile.is_technical_audience()
    assert not exec_profile.is_technical_audience()


def test_audience_is_executive():
    """Test executive audience check"""
    exec_profile = AudienceProfile(
        id="exec",
        name="Executive",
        type=AudienceType.C_SUITE,
        detail_level=DetailLevel.MINIMAL,
    )

    tech_profile = AudienceProfile(
        id="tech",
        name="Technical",
        type=AudienceType.TECHNICAL_LEAD,
        detail_level=DetailLevel.DETAILED,
    )

    assert exec_profile.is_executive_audience()
    assert not tech_profile.is_executive_audience()


def test_audience_get_max_bullet_points():
    """Test getting max bullet points for audience"""
    c_suite = AudienceProfile(
        id="c-suite",
        name="C-Suite",
        type=AudienceType.C_SUITE,
        detail_level=DetailLevel.MINIMAL,
    )

    tech_lead = AudienceProfile(
        id="tech",
        name="Technical Lead",
        type=AudienceType.TECHNICAL_LEAD,
        detail_level=DetailLevel.DETAILED,
    )

    assert c_suite.get_max_bullet_points() == 3
    assert tech_lead.get_max_bullet_points() == 7


def test_audience_get_max_words_per_bullet():
    """Test getting max words per bullet for audience"""
    c_suite = AudienceProfile(
        id="c-suite",
        name="C-Suite",
        type=AudienceType.C_SUITE,
        detail_level=DetailLevel.MINIMAL,
    )

    tech_lead = AudienceProfile(
        id="tech",
        name="Technical Lead",
        type=AudienceType.TECHNICAL_LEAD,
        detail_level=DetailLevel.DETAILED,
    )

    assert c_suite.get_max_words_per_bullet() == 15
    assert tech_lead.get_max_words_per_bullet() == 30


def test_audience_get_recommended_slide_count():
    """Test getting recommended slide count"""
    minimal = AudienceProfile(
        id="minimal",
        name="Minimal",
        type=AudienceType.C_SUITE,
        detail_level=DetailLevel.MINIMAL,
    )

    detailed = AudienceProfile(
        id="detailed",
        name="Detailed",
        type=AudienceType.TECHNICAL_LEAD,
        detail_level=DetailLevel.DETAILED,
    )

    min_slides, max_slides = minimal.get_recommended_slide_count()
    assert min_slides == 3
    assert max_slides == 5

    min_slides, max_slides = detailed.get_recommended_slide_count()
    assert min_slides == 12
    assert max_slides == 18


def test_audience_get_tone():
    """Test getting tone for audience"""
    exec_profile = AudienceProfile(
        id="exec",
        name="Executive",
        type=AudienceType.C_SUITE,
        detail_level=DetailLevel.MINIMAL,
    )

    tech_profile = AudienceProfile(
        id="tech",
        name="Technical",
        type=AudienceType.TECHNICAL_LEAD,
        detail_level=DetailLevel.DETAILED,
    )

    external_profile = AudienceProfile(
        id="external",
        name="External",
        type=AudienceType.EXTERNAL_CLIENT,
        detail_level=DetailLevel.STANDARD,
    )

    assert exec_profile.get_tone() == "executive"
    assert tech_profile.get_tone() == "technical"
    assert external_profile.get_tone() == "client-facing"


def test_audience_add_remove_interest():
    """Test adding and removing interests"""
    profile = AudienceProfile(
        id="test",
        name="Test",
        type=AudienceType.VP_DIRECTOR,
        detail_level=DetailLevel.STANDARD,
        interests=["strategy"],
    )

    assert len(profile.interests) == 1

    profile.add_interest("metrics")
    assert len(profile.interests) == 2
    assert "metrics" in profile.interests

    profile.remove_interest("strategy")
    assert len(profile.interests) == 1
    assert "strategy" not in profile.interests


def test_audience_preferences():
    """Test getting and setting preferences"""
    profile = AudienceProfile(
        id="test",
        name="Test",
        type=AudienceType.VP_DIRECTOR,
        detail_level=DetailLevel.STANDARD,
    )

    profile.set_preference("color_scheme", "blue")
    profile.set_preference("chart_style", "bar")

    assert profile.get_preference("color_scheme") == "blue"
    assert profile.get_preference("chart_style") == "bar"
    assert profile.get_preference("missing", "default") == "default"


def test_audience_validate():
    """Test audience validation"""
    valid_profile = AudienceProfile(
        id="valid",
        name="Valid Profile",
        type=AudienceType.C_SUITE,
        detail_level=DetailLevel.MINIMAL,
        technical_depth=0.5,
    )

    errors = valid_profile.validate()
    assert len(errors) == 0
    assert valid_profile.is_valid()


if __name__ == "__main__":
    # Run tests
    test_audience_profile_create()
    test_audience_is_technical()
    test_audience_is_executive()
    test_audience_get_max_bullet_points()
    test_audience_get_max_words_per_bullet()
    test_audience_get_recommended_slide_count()
    test_audience_get_tone()
    test_audience_add_remove_interest()
    test_audience_preferences()
    test_audience_validate()

    print("All tests passed!")
