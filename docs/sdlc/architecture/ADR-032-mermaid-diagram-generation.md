# ADR-032: Mermaid-Based Diagram Generation with SVG Pipeline

## Status
Proposed

## Date
2026-02-17

## Context

The current Exec Agent generates "diagrams" as colored rectangles with text labels (e.g., `shape.text = "Architecture Diagram\n(Auto-generated from system topology)"`). This is the single largest quality gap -- architecture, data flow, deployment, and timeline slides contain no actual visual information.

The redesigned agent must produce real diagrams from structured project data. These diagrams must:

1. **Be generated programmatically** from architecture specifications and project data (not manually drawn)
2. **Follow Deltek branding** (colors, fonts, node styles)
3. **Support multiple diagram types**: system architecture, data flow, deployment, sequence, Gantt, component, and charts
4. **Embed cleanly in PowerPoint** at arbitrary positions and sizes
5. **Cache results** to avoid redundant regeneration
6. **Degrade gracefully** if the rendering engine is unavailable
7. **Run locally** without cloud services

### Options Considered

1. **Mermaid (via mermaid-py or mermaid CLI)** -- Text-based diagram DSL. Supports flowcharts, sequence, Gantt, pie, class, state, C4 diagrams. Renders to SVG. Very widely adopted.

2. **Graphviz (via pygraphviz)** -- Classic graph layout engine. Excellent for directed graphs and network diagrams. Less support for Gantt charts and modern diagram types.

3. **D2 Language** -- Modern diagram scripting language. Excellent typography and layout. Renders to SVG. Less mature, smaller community.

4. **python-pptx Native Shapes** -- Build diagrams using PowerPoint shape primitives (rectangles, arrows, text boxes). No external dependency. Very limited layout capabilities.

5. **PlantUML** -- Mature UML diagram generator. Java dependency (requires JVM). Excellent for sequence and class diagrams. Weaker for architecture diagrams.

6. **Matplotlib / Plotly** -- Python charting libraries. Excellent for charts (bar, pie, line) but poor for architecture diagrams and flowcharts.

## Decision

We will use **Mermaid as the primary diagram engine** with a multi-stage rendering pipeline, and **python-pptx native shapes as the fallback**.

### Rendering Pipeline

```
Structured Data
      |
      v
Mermaid Syntax Generator (per diagram type)
      |
      v
Mermaid Theme Application (Deltek brand colors)
      |
      v
Mermaid CLI / mermaid-py --> SVG
      |
      v
SVG Post-Processing (font substitution, size normalization)
      |
      v
CairoSVG --> PNG (300 DPI for PPTX embedding)
      |
      v
python-pptx add_picture() at computed position
```

### Why Mermaid

| Criterion | Mermaid | Graphviz | D2 | Native Shapes | PlantUML | Plotly |
|-----------|---------|----------|-----|---------------|----------|--------|
| Architecture diagrams | Good | Good | Excellent | Poor | Fair | N/A |
| Sequence diagrams | Excellent | Poor | Good | Poor | Excellent | N/A |
| Gantt charts | Good | N/A | N/A | N/A | Good | N/A |
| Pie/bar charts | Good | N/A | N/A | Fair | N/A | Excellent |
| No external runtime | Yes (mermaid-py) | Needs graphviz | Needs d2 binary | Yes | Needs JVM | Yes |
| Theming support | Good | Limited | Good | N/A | Limited | Excellent |
| SVG output | Yes | Yes | Yes | N/A | Yes | Yes |
| Community/docs | Excellent | Good | Growing | N/A | Good | Excellent |
| Python integration | mermaid-py | pygraphviz | subprocess | Direct | subprocess | Direct |

Mermaid is the best general-purpose choice because it covers the widest range of diagram types needed (architecture, sequence, Gantt, pie, bar) with a single tool, good Python integration, and no external runtime dependency.

### Diagram Type to Mermaid Mapping

```python
DIAGRAM_TYPE_MAP = {
    DiagramType.SYSTEM_ARCHITECTURE: "flowchart TD",      # Top-down flowchart
    DiagramType.DATA_FLOW: "flowchart LR",                # Left-right flowchart
    DiagramType.DEPLOYMENT: "flowchart TD",               # Top-down with subgraphs
    DiagramType.SEQUENCE: "sequenceDiagram",              # Sequence diagram
    DiagramType.COMPONENT: "flowchart TD",                # With subgraph grouping
    DiagramType.GANTT: "gantt",                           # Gantt chart
    DiagramType.PIE_CHART: "pie",                         # Pie chart
    DiagramType.BAR_CHART: "xychart-beta",                # XY chart (Mermaid v10+)
}
```

### Deltek Theme Configuration

```python
DELTEK_MERMAID_THEME = """
%%{init: {
  'theme': 'base',
  'themeVariables': {
    'primaryColor': '#1742F6',
    'primaryTextColor': '#FFFFFF',
    'primaryBorderColor': '#081581',
    'secondaryColor': '#00B6C3',
    'tertiaryColor': '#6D18F1',
    'lineColor': '#3C454E',
    'textColor': '#3C454E',
    'fontSize': '14px',
    'fontFamily': 'Figtree, Arial, sans-serif',
    'nodeBorder': '2px',
    'mainBkg': '#1742F6',
    'nodeBkg': '#1742F6',
    'clusterBkg': '#F1F5FA',
    'clusterBorder': '#081581',
    'titleColor': '#081581'
  }
}}%%
"""
```

### Fallback Strategy

When Mermaid is not available (not installed, rendering fails):

1. **Detection**: `MermaidRenderer.is_available()` checks for mermaid CLI or mermaid-py
2. **Fallback**: `NativeShapeDiagramRenderer` uses python-pptx shapes to create simplified diagrams
3. **Logging**: Every fallback is logged for visibility
4. **Quality flag**: The QualityScorer reduces the visual quality score when fallback is used

The native shape fallback generates:
- Rounded rectangles for components (with Deltek blue fill)
- Arrow connectors between related components
- Text labels inside and beside shapes
- Subgroup boundaries as dashed rectangles

This produces recognizable architecture diagrams, though less polished than Mermaid SVGs.

### Chart Generation Supplement

For charts that Mermaid handles poorly (complex multi-series bar charts, sparklines), we use **python-pptx native chart objects**:

```python
from pptx.chart.data import CategoryChartData
from pptx.enum.chart import XL_CHART_TYPE

# python-pptx has built-in chart support
chart_data = CategoryChartData()
chart_data.categories = ['Phase 1', 'Phase 2', 'Phase 3']
chart_data.add_series('Planned', (10, 20, 30))
chart_data.add_series('Actual', (8, 22, 25))
chart = slide.shapes.add_chart(XL_CHART_TYPE.COLUMN_CLUSTERED, ...)
```

This hybrid approach gives us:
- **Mermaid**: Architecture, data flow, deployment, sequence, Gantt, pie
- **python-pptx charts**: Bar charts, line charts, combo charts with complex data
- **Native shapes**: Fallback for all types when Mermaid is unavailable

## Consequences

### Positive

- **Real diagrams**: Architecture slides contain actual system topology, not placeholder text
- **Wide coverage**: 8+ diagram types from a single tool
- **Brandable**: Mermaid's theming system supports Deltek color palette
- **Cacheable**: SVG/PNG output can be cached by content hash
- **Graceful degradation**: Two fallback levels (python-pptx charts, native shapes)
- **Text-based source**: Mermaid syntax is human-readable and versionable

### Negative

- **Optional dependency**: mermaid-py or mermaid CLI must be installed for best results. Installation adds complexity. Mitigated by clear install.sh instructions and graceful fallback.
- **SVG to PNG conversion**: Requires CairoSVG (which requires Cairo system library). Alternative: use Pillow to render SVG if Cairo unavailable. Worst case: embed SVG directly (some PowerPoint versions support it).
- **Font rendering**: Figtree font may not be available in the Mermaid rendering environment. Mitigated by font fallback chain (Figtree -> Arial -> sans-serif) in the theme config.
- **Diagram layout quality**: Mermaid's auto-layout is sometimes suboptimal for complex architectures. Mitigated by keeping diagrams under 15 nodes per slide.

### Neutral

- Mermaid diagram source strings are stored alongside presentations for regeneration
- Cache invalidation uses content hash of the Mermaid source + theme
- Diagram rendering is the most time-consuming step in generation (1-2 seconds per diagram)
