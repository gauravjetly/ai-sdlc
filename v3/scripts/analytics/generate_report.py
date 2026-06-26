"""
generate_report.py
==================
Reads reports/analytics_data.json and produces:
  - reports/weekly_report.html  — rich HTML email-ready report
  - reports/weekly_report.md    — Markdown report for GitHub Issues
  - reports/charts/*.png        — chart images embedded in the HTML report
"""
from __future__ import annotations

import json
import os
from datetime import datetime
from pathlib import Path

# ── Config ────────────────────────────────────────────────────────────────────
OUTPUT_DIR  = Path("reports")
CHARTS_DIR  = OUTPUT_DIR / "charts"
DATA_FILE   = OUTPUT_DIR / "analytics_data.json"
HTML_FILE   = OUTPUT_DIR / "weekly_report.html"
MD_FILE     = OUTPUT_DIR / "weekly_report.md"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
CHARTS_DIR.mkdir(parents=True, exist_ok=True)

REPORT_TITLE = os.getenv("REPORT_TITLE", "AI-SDLC Demo Page — Weekly Analytics Report")


# ── Load data ─────────────────────────────────────────────────────────────────

def load_data() -> dict:
    if DATA_FILE.exists():
        return json.loads(DATA_FILE.read_text())
    # Fallback demo data so the report always renders
    print("  [Report] No data file found — using demo data.")
    return {
        "generated_at": datetime.utcnow().isoformat(),
        "period_start": "2025-01-13",
        "period_end":   "2025-01-19",
        "period_days":  7,
        "demo_page_url": "https://ai-sdlc.yourdomain.com",
        "primary": {
            "pageviews": 1_240, "pageviews_prev": 980,  "pageviews_change": 26.5,
            "visitors":    430, "visitors_prev":  360,  "visitors_change":  19.4,
            "bounce_rate": 38,  "visit_duration_sec": 187,
            "demo_runs":   312, "command_copies": 198,
            "demo_completions": 241, "completion_rate": 77.2,
        },
        "plausible": {
            "timeseries": [
                {"date": f"2025-01-{13+i:02d}", "visitors": 50+i*8, "pageviews": 160+i*12}
                for i in range(7)
            ],
            "events": [
                {"name": "demo_run",        "events": 312},
                {"name": "demo_complete",   "events": 241},
                {"name": "command_copied",  "events": 198},
                {"name": "mcp_config_copied","events": 87},
                {"name": "command_configured","events": 156},
                {"name": "pageview",        "events": 1240},
            ],
            "referrers": [
                {"referrer": "github.com",       "visitors": 180},
                {"referrer": "twitter.com",      "visitors": 95},
                {"referrer": "linkedin.com",     "visitors": 72},
                {"referrer": "hackernews.com",   "visitors": 48},
                {"referrer": "(direct)",         "visitors": 35},
            ],
            "countries": [
                {"country": "United States", "visitors": 180},
                {"country": "India",         "visitors": 72},
                {"country": "Germany",       "visitors": 45},
                {"country": "United Kingdom","visitors": 38},
                {"country": "Canada",        "visitors": 30},
            ],
            "devices": [
                {"device": "Desktop", "visitors": 310},
                {"device": "Mobile",  "visitors": 98},
                {"device": "Tablet",  "visitors": 22},
            ],
        },
        "ga4": {},
    }


# ── Chart generation ──────────────────────────────────────────────────────────

def generate_charts(data: dict) -> dict[str, str]:
    """Generate PNG charts and return {name: base64_data_uri} map."""
    try:
        import matplotlib
        matplotlib.use("Agg")
        import matplotlib.pyplot as plt
        import matplotlib.ticker as mticker
        import base64
        from io import BytesIO
    except ImportError:
        print("  [Charts] matplotlib not available — skipping charts.")
        return {}

    charts = {}
    plt.rcParams.update({
        "figure.facecolor": "#0f1629",
        "axes.facecolor":   "#0f1629",
        "axes.edgecolor":   "#1e2d4a",
        "axes.labelcolor":  "#94a3b8",
        "xtick.color":      "#64748b",
        "ytick.color":      "#64748b",
        "text.color":       "#e2e8f0",
        "grid.color":       "#1e2d4a",
        "grid.linestyle":   "--",
        "grid.alpha":       0.5,
        "font.family":      "monospace",
    })

    def to_b64(fig) -> str:
        buf = BytesIO()
        fig.savefig(buf, format="png", dpi=120, bbox_inches="tight",
                    facecolor=fig.get_facecolor())
        buf.seek(0)
        encoded = base64.b64encode(buf.read()).decode()
        plt.close(fig)
        return f"data:image/png;base64,{encoded}"

    plausible  = data.get("plausible", {})
    timeseries = plausible.get("timeseries", [])
    primary    = data.get("primary", {})

    # ── Chart 1: Daily pageviews & visitors ───────────────────────────────────
    if timeseries:
        dates     = [r.get("date", "")[-5:]  for r in timeseries]
        pageviews = [int(r.get("pageviews", 0)) for r in timeseries]
        visitors  = [int(r.get("visitors",  0)) for r in timeseries]

        fig, ax = plt.subplots(figsize=(8, 3.5))
        ax.fill_between(dates, pageviews, alpha=0.15, color="#00d4ff")
        ax.plot(dates, pageviews, color="#00d4ff", linewidth=2, marker="o", markersize=4, label="Pageviews")
        ax.fill_between(dates, visitors,  alpha=0.15, color="#10b981")
        ax.plot(dates, visitors,  color="#10b981", linewidth=2, marker="o", markersize=4, label="Visitors")
        ax.set_title("Daily Pageviews & Visitors", color="#e2e8f0", fontsize=12, pad=12)
        ax.legend(framealpha=0, labelcolor="#94a3b8")
        ax.yaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"{int(x):,}"))
        ax.grid(True, axis="y")
        ax.spines[["top","right"]].set_visible(False)
        charts["timeseries"] = to_b64(fig)

    # ── Chart 2: Custom events bar chart ─────────────────────────────────────
    events_raw = [e for e in plausible.get("events", []) if e.get("name") != "pageview"]
    if events_raw:
        names  = [e.get("name", "").replace("_", " ").title() for e in events_raw[:8]]
        counts = [int(e.get("events", 0)) for e in events_raw[:8]]
        colors = ["#00d4ff","#10b981","#7c3aed","#f59e0b","#ef4444","#3b82f6","#ec4899","#14b8a6"]

        fig, ax = plt.subplots(figsize=(8, 3.5))
        bars = ax.barh(names[::-1], counts[::-1], color=colors[:len(names)], height=0.55)
        for bar, count in zip(bars, counts[::-1]):
            ax.text(bar.get_width() + max(counts) * 0.01, bar.get_y() + bar.get_height()/2,
                    f"{count:,}", va="center", color="#94a3b8", fontsize=9)
        ax.set_title("Custom Event Breakdown", color="#e2e8f0", fontsize=12, pad=12)
        ax.xaxis.set_major_formatter(mticker.FuncFormatter(lambda x, _: f"{int(x):,}"))
        ax.grid(True, axis="x")
        ax.spines[["top","right","left"]].set_visible(False)
        charts["events"] = to_b64(fig)

    # ── Chart 3: Traffic sources donut ────────────────────────────────────────
    referrers = plausible.get("referrers", [])
    if referrers:
        labels = [r.get("referrer", "unknown")[:20] for r in referrers[:6]]
        sizes  = [int(r.get("visitors", 0))          for r in referrers[:6]]
        colors = ["#00d4ff","#10b981","#7c3aed","#f59e0b","#ef4444","#3b82f6"]

        fig, ax = plt.subplots(figsize=(5, 4))
        wedges, texts, autotexts = ax.pie(
            sizes, labels=labels, autopct="%1.0f%%",
            colors=colors[:len(labels)], startangle=90,
            wedgeprops={"width": 0.55, "edgecolor": "#0f1629", "linewidth": 2},
            textprops={"color": "#94a3b8", "fontsize": 9},
        )
        for at in autotexts:
            at.set_color("#e2e8f0")
            at.set_fontsize(8)
        ax.set_title("Traffic Sources", color="#e2e8f0", fontsize=12, pad=12)
        charts["referrers"] = to_b64(fig)

    # ── Chart 4: Device breakdown ─────────────────────────────────────────────
    devices = plausible.get("devices", [])
    if devices:
        labels = [d.get("device", "?") for d in devices]
        sizes  = [int(d.get("visitors", 0)) for d in devices]
        colors = ["#00d4ff", "#10b981", "#f59e0b"]

        fig, ax = plt.subplots(figsize=(4, 3.5))
        ax.pie(sizes, labels=labels, autopct="%1.0f%%",
               colors=colors[:len(labels)], startangle=90,
               wedgeprops={"edgecolor": "#0f1629", "linewidth": 2},
               textprops={"color": "#94a3b8", "fontsize": 9})
        ax.set_title("Device Breakdown", color="#e2e8f0", fontsize=12, pad=12)
        charts["devices"] = to_b64(fig)

    print(f"  [Charts] Generated {len(charts)} charts.")
    return charts


# ── HTML report ───────────────────────────────────────────────────────────────

def generate_html(data: dict, charts: dict) -> str:
    p     = data["primary"]
    now   = datetime.fromisoformat(data["generated_at"].replace("Z", "+00:00"))
    title = REPORT_TITLE

    def arrow(change: float) -> str:
        if change > 0:  return f'<span style="color:#10b981">▲ {change:+.1f}%</span>'
        if change < 0:  return f'<span style="color:#ef4444">▼ {change:.1f}%</span>'
        return '<span style="color:#64748b">— 0%</span>'

    def fmt(n) -> str:
        return f"{int(n):,}"

    def dur(sec: int) -> str:
        m, s = divmod(int(sec), 60)
        return f"{m}m {s:02d}s" if m else f"{s}s"

    chart_img = lambda key: (
        f'<img src="{charts[key]}" style="width:100%;border-radius:8px;margin-top:12px;" />'
        if key in charts else ""
    )

    # Top countries table
    countries_rows = ""
    for c in data.get("plausible", {}).get("countries", [])[:5]:
        countries_rows += f"<tr><td>{c.get('country','?')}</td><td style='text-align:right'>{fmt(c.get('visitors',0))}</td></tr>"

    # Top referrers table
    referrer_rows = ""
    for r in data.get("plausible", {}).get("referrers", [])[:5]:
        referrer_rows += f"<tr><td>{r.get('referrer','?')}</td><td style='text-align:right'>{fmt(r.get('visitors',0))}</td></tr>"

    html = f"""<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8" />
<meta name="viewport" content="width=device-width,initial-scale=1" />
<title>{title}</title>
<style>
  *{{box-sizing:border-box;margin:0;padding:0}}
  body{{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;background:#0a0e1a;color:#e2e8f0;line-height:1.6}}
  .wrap{{max-width:800px;margin:0 auto;padding:32px 16px}}
  .header{{background:linear-gradient(135deg,#0f1629,#141d35);border:1px solid #1e2d4a;border-radius:12px;padding:32px;margin-bottom:24px;text-align:center}}
  .header h1{{font-size:1.6rem;font-weight:800;color:#f8fafc;margin-bottom:8px}}
  .header .sub{{color:#64748b;font-size:0.9rem}}
  .header .period{{display:inline-block;background:rgba(0,212,255,0.1);border:1px solid rgba(0,212,255,0.2);color:#00d4ff;padding:4px 14px;border-radius:20px;font-size:12px;font-weight:700;margin-top:12px}}
  .kpi-grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:24px}}
  .kpi{{background:#0f1629;border:1px solid #1e2d4a;border-radius:10px;padding:20px;text-align:center}}
  .kpi-val{{font-size:2rem;font-weight:800;color:#f8fafc;font-family:monospace;line-height:1}}
  .kpi-lbl{{font-size:11px;color:#64748b;text-transform:uppercase;letter-spacing:.06em;margin-top:6px}}
  .kpi-chg{{font-size:12px;margin-top:6px}}
  .section{{background:#0f1629;border:1px solid #1e2d4a;border-radius:12px;padding:24px;margin-bottom:20px}}
  .section h2{{font-size:1rem;font-weight:700;color:#f8fafc;margin-bottom:4px}}
  .section .desc{{font-size:12px;color:#64748b;margin-bottom:16px}}
  table{{width:100%;border-collapse:collapse;font-size:13px}}
  th{{text-align:left;color:#64748b;font-size:11px;text-transform:uppercase;letter-spacing:.06em;padding:8px 0;border-bottom:1px solid #1e2d4a}}
  td{{padding:8px 0;border-bottom:1px solid rgba(255,255,255,0.04);color:#e2e8f0}}
  .footer{{text-align:center;color:#64748b;font-size:12px;margin-top:32px;padding-top:24px;border-top:1px solid #1e2d4a}}
  .footer a{{color:#00d4ff;text-decoration:none}}
  .highlight{{color:#00d4ff;font-weight:700}}
  .green{{color:#10b981;font-weight:700}}
  .amber{{color:#f59e0b;font-weight:700}}
</style>
</head>
<body>
<div class="wrap">

  <div class="header">
    <h1>📊 {title}</h1>
    <div class="sub">Generated {now.strftime('%A, %B %d %Y at %H:%M UTC')}</div>
    <div class="period">📅 {data['period_start']} → {data['period_end']} ({data['period_days']} days)</div>
  </div>

  <!-- KPI Grid -->
  <div class="kpi-grid">
    <div class="kpi">
      <div class="kpi-val highlight">{fmt(p['pageviews'])}</div>
      <div class="kpi-lbl">Pageviews</div>
      <div class="kpi-chg">{arrow(p['pageviews_change'])}</div>
    </div>
    <div class="kpi">
      <div class="kpi-val">{fmt(p['visitors'])}</div>
      <div class="kpi-lbl">Visitors</div>
      <div class="kpi-chg">{arrow(p['visitors_change'])}</div>
    </div>
    <div class="kpi">
      <div class="kpi-val green">{fmt(p['demo_runs'])}</div>
      <div class="kpi-lbl">Demo Runs</div>
      <div class="kpi-chg">&nbsp;</div>
    </div>
    <div class="kpi">
      <div class="kpi-val amber">{fmt(p['command_copies'])}</div>
      <div class="kpi-lbl">Cmd Copies</div>
      <div class="kpi-chg">&nbsp;</div>
    </div>
    <div class="kpi">
      <div class="kpi-val" style="color:#7c3aed">{fmt(p['demo_completions'])}</div>
      <div class="kpi-lbl">Completions</div>
      <div class="kpi-chg"><span style="color:#10b981">{p['completion_rate']:.1f}% rate</span></div>
    </div>
    <div class="kpi">
      <div class="kpi-val" style="color:#f59e0b">{dur(p['visit_duration_sec'])}</div>
      <div class="kpi-lbl">Avg Duration</div>
      <div class="kpi-chg">&nbsp;</div>
    </div>
  </div>

  <!-- Timeseries chart -->
  <div class="section">
    <h2>📈 Daily Traffic</h2>
    <div class="desc">Pageviews and unique visitors over the reporting period.</div>
    {chart_img('timeseries')}
  </div>

  <!-- Events chart -->
  <div class="section">
    <h2>⚡ User Engagement Events</h2>
    <div class="desc">Custom events tracked on the demo page — demo runs, copies, completions, and more.</div>
    {chart_img('events')}
  </div>

  <!-- Two-column: referrers + countries -->
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-bottom:20px">
    <div class="section">
      <h2>🔗 Top Traffic Sources</h2>
      <div class="desc">Where visitors came from.</div>
      {chart_img('referrers')}
      <table style="margin-top:16px">
        <tr><th>Source</th><th style="text-align:right">Visitors</th></tr>
        {referrer_rows}
      </table>
    </div>
    <div class="section">
      <h2>🌍 Top Countries</h2>
      <div class="desc">Geographic distribution of visitors.</div>
      {chart_img('devices')}
      <table style="margin-top:16px">
        <tr><th>Country</th><th style="text-align:right">Visitors</th></tr>
        {countries_rows}
      </table>
    </div>
  </div>

  <div class="footer">
    <p>
      <a href="{data['demo_page_url']}">{data['demo_page_url']}</a> ·
      <a href="https://github.com/gauravjetly/ai-sdlc">github.com/gauravjetly/ai-sdlc</a>
    </p>
    <p style="margin-top:6px">AI-SDLC v3.0.0 · Automated Weekly Report · Powered by GitHub Actions</p>
  </div>

</div>
</body>
</html>"""
    return html


# ── Markdown report ───────────────────────────────────────────────────────────

def generate_markdown(data: dict) -> str:
    p     = data["primary"]
    now   = datetime.fromisoformat(data["generated_at"].replace("Z", "+00:00"))

    def arrow(change: float) -> str:
        if change > 0:  return f"▲ +{change:.1f}%"
        if change < 0:  return f"▼ {change:.1f}%"
        return "— 0%"

    def fmt(n) -> str:
        return f"{int(n):,}"

    def dur(sec: int) -> str:
        m, s = divmod(int(sec), 60)
        return f"{m}m {s:02d}s" if m else f"{s}s"

    referrer_rows = "\n".join(
        f"| {r.get('referrer','?')} | {fmt(r.get('visitors',0))} |"
        for r in data.get("plausible", {}).get("referrers", [])[:5]
    )

    country_rows = "\n".join(
        f"| {c.get('country','?')} | {fmt(c.get('visitors',0))} |"
        for c in data.get("plausible", {}).get("countries", [])[:5]
    )

    event_rows = "\n".join(
        f"| {e.get('name','?').replace('_',' ').title()} | {fmt(e.get('events',0))} |"
        for e in data.get("plausible", {}).get("events", [])
        if e.get("name") != "pageview"
    )

    return f"""# 📊 {REPORT_TITLE}

> **Period:** {data['period_start']} → {data['period_end']} ({data['period_days']} days)
> **Generated:** {now.strftime('%A, %B %d %Y at %H:%M UTC')}
> **Demo Page:** [{data['demo_page_url']}]({data['demo_page_url']})

---

## Key Metrics

| Metric | This Week | vs Last Week |
|--------|-----------|--------------|
| **Pageviews** | **{fmt(p['pageviews'])}** | {arrow(p['pageviews_change'])} |
| **Visitors** | **{fmt(p['visitors'])}** | {arrow(p['visitors_change'])} |
| **Demo Runs** | **{fmt(p['demo_runs'])}** | — |
| **Command Copies** | **{fmt(p['command_copies'])}** | — |
| **Demo Completions** | **{fmt(p['demo_completions'])}** | — |
| **Completion Rate** | **{p['completion_rate']:.1f}%** | — |
| **Avg Session Duration** | **{dur(p['visit_duration_sec'])}** | — |
| **Bounce Rate** | **{p['bounce_rate']}%** | — |

---

## Custom Events

| Event | Count |
|-------|-------|
{event_rows}

---

## Traffic Sources

| Source | Visitors |
|--------|----------|
{referrer_rows}

---

## Top Countries

| Country | Visitors |
|---------|----------|
{country_rows}

---

## Insights

- The demo page received **{fmt(p['pageviews'])} pageviews** from **{fmt(p['visitors'])} unique visitors** this week.
- **{fmt(p['demo_runs'])} pipeline demos** were run, with a **{p['completion_rate']:.1f}% completion rate** ({fmt(p['demo_completions'])} completions).
- The `aisdlc run` command was copied **{fmt(p['command_copies'])} times**, indicating strong developer intent.
- Average session duration of **{dur(p['visit_duration_sec'])}** shows high engagement with the interactive terminal demo.

---

*Automated report generated by [AI-SDLC GitHub Actions](https://github.com/gauravjetly/ai-sdlc/actions) · [View demo page]({data['demo_page_url']})*
"""


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print(f"\n📝 Generating weekly analytics report...\n")

    data   = load_data()
    charts = generate_charts(data)

    html = generate_html(data, charts)
    HTML_FILE.write_text(html)
    print(f"  ✅ HTML report → {HTML_FILE}")

    md = generate_markdown(data)
    MD_FILE.write_text(md)
    print(f"  ✅ Markdown report → {MD_FILE}")

    print("\n✅ Report generation complete.")


if __name__ == "__main__":
    main()
