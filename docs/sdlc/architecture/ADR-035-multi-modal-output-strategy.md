# ADR-035: Multi-Modal Output Strategy

**Status**: Proposed
**Date**: 2026-02-17
**Author**: Jets (World-Class Architect)
**Context**: ARCH-20260217-EXEC-AGENT-V2

---

## Context

The Exec Agent V1 produces a single output format: PowerPoint (.pptx) via python-pptx. While PowerPoint is the primary format for executive presentations, it has limitations:

1. **Email distribution**: Attaching a .pptx file to email requires recipients to have PowerPoint or compatible software
2. **Browser viewing**: Cannot be viewed in a web browser without conversion
3. **Dashboard embedding**: Cannot be embedded in the AI-SDLC dashboard as interactive content
4. **Preparation**: Executives who need to present the deck verbally have no speaker notes or briefing script
5. **Archival**: PPTX is a binary format; text-based alternatives are better for version control and searching
6. **Mobile viewing**: PPTX rendering varies across mobile devices; HTML/PDF are more reliable

The V2 architecture requires the Exec Agent to serve multiple consumption contexts without duplicating the generation pipeline.

## Decision

Implement a **Multi-Modal Output Strategy** where all output formats are generated from the same domain model (`Presentation`). The V1 pipeline continues to produce the domain model. A new Export Service routes the model to format-specific renderers that implement a common `OutputRendererPort` protocol.

### Output Formats

| Format | Technology | Primary Use Case | Required? | Dependency |
|--------|-----------|------------------|-----------|------------|
| **PPTX** | python-pptx (existing) | Editing, presenting, offline viewing | Yes (core) | python-pptx (installed) |
| **PDF** | libreoffice headless | Email, printing, archival | No | libreoffice CLI |
| **HTML** | Jinja2 + Chart.js | Browser, dashboard, sharing | No | Jinja2 (pip) |
| **Briefing Script** | Claude API | Verbal preparation, speaker notes | No | ANTHROPIC_API_KEY |

### Architecture

```
Presentation (Domain Model)
         |
    ExportService (Application Layer)
         |
    +----+----+----+----+
    |    |    |    |    |
    v    v    v    v    |
  PPTX  PDF HTML Script |
   |    |    |    |    |
   v    v    v    v    v
 .pptx .pdf .html/ .md  (fallback: PPTX only)
```

### OutputRendererPort Protocol

```python
class OutputRendererPort(Protocol):
    def render(self, presentation: Presentation, output_dir: Path) -> Path:
        """Render presentation to format. Returns path to output file/dir."""
        ...

    def is_available(self) -> bool:
        """Check if renderer dependencies are installed."""
        ...

    def get_format_name(self) -> str:
        """Return format identifier: 'pptx', 'pdf', 'html', 'briefing'."""
        ...
```

### Export Service Behavior

```python
class ExportService:
    def export(self, presentation, formats: List[str], output_dir) -> Dict[str, Optional[Path]]:
        """
        1. For each requested format:
           a. Check if renderer is available
           b. If available: render and return path
           c. If unavailable: return None with warning log
        2. PPTX is always rendered (guaranteed baseline)
        3. Failed renders do not block other formats
        """
```

### Format-Specific Details

**PDF Renderer**:
- Uses `soffice --headless --convert-to pdf input.pptx`
- Requires libreoffice installed (`brew install --cask libreoffice` on macOS)
- Timeout: 30 seconds per conversion
- Fallback: if libreoffice is not installed, `is_available()` returns False, no PDF generated

**HTML Renderer**:
- Generates a self-contained folder with `index.html`, per-slide pages, and assets
- Uses Jinja2 templates with Deltek CSS (Figtree font, #1742F6 primary, #081581 secondary)
- Charts rendered via Chart.js from metrics data
- Mermaid diagrams rendered to SVG and embedded inline
- Navigation: arrow keys, table of contents sidebar
- Responsive design for mobile viewing

**Briefing Script Writer**:
- Uses Claude API to generate a Markdown file with:
  - Per-slide talking points (3-5 per slide)
  - Timing estimates (total deck time allocation)
  - Anticipated questions and suggested answers
  - Key data points to emphasize
- Format: `## Slide N: {title}\n\n**Duration**: ~X minutes\n\n### Talking Points\n- ...\n\n### Anticipated Questions\n- ...`

## Alternatives Considered

### Alternative A: Single PPTX Output (Status Quo)

Keep PPTX as the only output format.

- **Pro**: No additional dependencies, simple implementation
- **Con**: Cannot serve browser, email/PDF, or preparation use cases
- **Rejected because**: Executive consumption is multi-channel. A best-in-class agent must serve all channels.

### Alternative B: Convert PPTX to All Formats

Generate PPTX first, then convert to PDF and images, then wrap images in HTML.

- **Pro**: Single source of truth (PPTX), consistent visual output
- **Con**: Lossy conversion (PPTX to images loses interactivity), requires libreoffice for all formats, no advantage for HTML dashboards
- **Rejected because**: Converting PPTX to HTML via images produces a poor web experience. Better to render HTML natively from the domain model.

### Alternative C: HTML-First with PDF/PPTX Export

Generate HTML as the primary format and derive PPTX and PDF from it.

- **Pro**: Best web experience, single rendering path
- **Con**: HTML-to-PPTX conversion is lossy and complex, PPTX is the primary deliverable, reverses the priority hierarchy
- **Rejected because**: PPTX remains the primary executive format. Making it secondary would degrade the core use case.

### Alternative D: Use reveal.js for HTML Presentations

Use reveal.js (JavaScript presentation framework) for HTML output.

- **Pro**: Professional presentation-style HTML, keyboard navigation, transitions
- **Con**: Heavy JavaScript dependency, requires Node.js for rendering, overkill for dashboard embedding
- **Rejected because**: Jinja2 + vanilla JS is simpler, lighter, and sufficient for the use case. reveal.js adds complexity without proportional benefit for static content.

### Alternative E: Generate LaTeX for PDF

Use LaTeX/Beamer for PDF generation instead of libreoffice conversion.

- **Pro**: Professional PDF quality, programmatic control over layout
- **Con**: Requires LaTeX installation (500+ MB), complex template authoring, different styling system from PPTX
- **Rejected because**: libreoffice conversion from PPTX produces adequate PDF quality and reuses the existing PPTX output. LaTeX adds massive dependency for marginal visual improvement.

## Consequences

### Positive

- Presentations can be consumed in any context (browser, email, verbal, edit)
- Dashboard can embed live HTML presentations without PPTX dependencies
- Executives who present verbally have structured preparation material
- PDF provides reliable cross-platform viewing for email distribution
- All formats are generated from one domain model, ensuring consistency
- Each renderer is independently testable with mock Presentation objects
- Unavailable renderers gracefully degrade (PPTX always works)

### Negative

- Additional code to maintain (3 new renderers + export service)
- PDF rendering requires libreoffice installation (not always available in CI)
- HTML templates must be maintained alongside PPTX templates
- Briefing script generation adds Claude API cost per export
- Multiple output formats increase disk usage per presentation

### Risks

| Risk | Mitigation |
|------|-----------|
| libreoffice not installable in some environments | PDF is optional; `is_available()` check prevents errors |
| HTML template styling diverges from PPTX | Share Deltek CSS constants with PPTX color/font constants |
| Briefing script generation fails (API error) | Fallback: extract bullet points from slides as basic script |
| HTML folder structure confuses users | Include README.txt in output folder explaining how to open |

## Implementation Notes

**Files to create**:
- `domain/entities/multi_modal_output.py` -- MultiModalOutput config dataclass
- `domain/interfaces/output_renderer_port.py` -- OutputRendererPort protocol
- `application/services/export_service.py` -- ExportService orchestrator
- `infrastructure/export/pdf_renderer.py` -- libreoffice-based PDF renderer
- `infrastructure/export/html_renderer.py` -- Jinja2-based HTML renderer
- `infrastructure/export/briefing_script_writer.py` -- Claude API-based script writer
- `infrastructure/export/templates/` -- Jinja2 HTML templates with Deltek branding

**Dependencies to add**:
- `Jinja2>=3.1` (for HTML templating)
- libreoffice (system-level, optional, detected at runtime)

**Test strategy**:
- Unit test: ExportService routes to correct renderers based on availability
- Unit test: Each renderer produces expected file type from mock Presentation
- Integration test: Full pipeline produces valid .pptx and .html from same input
- Integration test: HTML output opens in browser and displays all slide content
