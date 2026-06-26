"""
collect_analytics.py
====================
Collects analytics data from Plausible and/or Google Analytics 4,
then writes a unified JSON file at reports/analytics_data.json.

Environment variables (set as GitHub Actions secrets):
  PLAUSIBLE_API_KEY    — Plausible API key
  PLAUSIBLE_SITE_ID    — e.g. "ai-sdlc.yourdomain.com"
  PLAUSIBLE_BASE_URL   — e.g. "https://plausible.io" or your self-hosted URL
  GA4_PROPERTY_ID      — e.g. "properties/123456789"
  GA4_CREDENTIALS_JSON — Service account JSON (base64-encoded or raw JSON string)
  PERIOD_DAYS          — Number of days to report on (default: 7)
  DEMO_PAGE_URL        — Full URL of the demo page
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from typing import Any

import requests

# ── Config ────────────────────────────────────────────────────────────────────
PERIOD_DAYS     = int(os.getenv("PERIOD_DAYS", "7"))
DEMO_PAGE_URL   = os.getenv("DEMO_PAGE_URL", "https://ai-sdlc.yourdomain.com")
OUTPUT_DIR      = Path("reports")
OUTPUT_FILE     = OUTPUT_DIR / "analytics_data.json"
CHARTS_DIR      = OUTPUT_DIR / "charts"

OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
CHARTS_DIR.mkdir(parents=True, exist_ok=True)

NOW        = datetime.now(timezone.utc)
PERIOD_END = NOW.date()
PERIOD_START = (NOW - timedelta(days=PERIOD_DAYS)).date()
PREV_START   = (NOW - timedelta(days=PERIOD_DAYS * 2)).date()
PREV_END     = PERIOD_START - timedelta(days=1)


# ── Plausible collector ───────────────────────────────────────────────────────

def collect_plausible() -> dict[str, Any]:
    """Fetch stats from Plausible Analytics API."""
    api_key  = os.getenv("PLAUSIBLE_API_KEY", "")
    site_id  = os.getenv("PLAUSIBLE_SITE_ID", "")
    base_url = os.getenv("PLAUSIBLE_BASE_URL", "https://plausible.io").rstrip("/")

    if not api_key or not site_id:
        print("  [Plausible] Skipped — PLAUSIBLE_API_KEY or PLAUSIBLE_SITE_ID not set.")
        return {}

    headers = {"Authorization": f"Bearer {api_key}"}
    period  = f"{PERIOD_START},{PERIOD_END}"
    prev    = f"{PREV_START},{PREV_END}"

    def get(endpoint: str, params: dict) -> dict:
        url = f"{base_url}/api/v1/stats/{endpoint}"
        r   = requests.get(url, headers=headers, params=params, timeout=30)
        r.raise_for_status()
        return r.json()

    def aggregate(date_range: str) -> dict:
        return get("aggregate", {
            "site_id": site_id,
            "period":  "custom",
            "date":    date_range,
            "metrics": "visitors,pageviews,bounce_rate,visit_duration,events",
        }).get("results", {})

    current  = aggregate(period)
    previous = aggregate(prev)

    # Top pages
    pages = get("breakdown", {
        "site_id":  site_id,
        "period":   "custom",
        "date":     period,
        "property": "event:page",
        "metrics":  "visitors,pageviews",
        "limit":    10,
    }).get("results", [])

    # Top events (custom events like demo_run, command_copied)
    events = get("breakdown", {
        "site_id":  site_id,
        "period":   "custom",
        "date":     period,
        "property": "event:name",
        "metrics":  "visitors,events",
        "limit":    20,
    }).get("results", [])

    # Daily timeseries
    timeseries = get("timeseries", {
        "site_id": site_id,
        "period":  "custom",
        "date":    period,
        "metrics": "visitors,pageviews",
    }).get("results", [])

    # Top referrers
    referrers = get("breakdown", {
        "site_id":  site_id,
        "period":   "custom",
        "date":     period,
        "property": "visit:referrer",
        "metrics":  "visitors",
        "limit":    10,
    }).get("results", [])

    # Top countries
    countries = get("breakdown", {
        "site_id":  site_id,
        "period":   "custom",
        "date":     period,
        "property": "visit:country",
        "metrics":  "visitors",
        "limit":    10,
    }).get("results", [])

    # Top devices
    devices = get("breakdown", {
        "site_id":  site_id,
        "period":   "custom",
        "date":     period,
        "property": "visit:device",
        "metrics":  "visitors",
        "limit":    5,
    }).get("results", [])

    print(f"  [Plausible] Collected — pageviews: {current.get('pageviews',{}).get('value',0)}")
    return {
        "source":     "plausible",
        "current":    current,
        "previous":   previous,
        "pages":      pages,
        "events":     events,
        "timeseries": timeseries,
        "referrers":  referrers,
        "countries":  countries,
        "devices":    devices,
    }


# ── GA4 collector ─────────────────────────────────────────────────────────────

def collect_ga4() -> dict[str, Any]:
    """Fetch stats from Google Analytics 4 Data API."""
    property_id  = os.getenv("GA4_PROPERTY_ID", "")
    creds_json   = os.getenv("GA4_CREDENTIALS_JSON", "")

    if not property_id or not creds_json:
        print("  [GA4] Skipped — GA4_PROPERTY_ID or GA4_CREDENTIALS_JSON not set.")
        return {}

    try:
        from google.analytics.data_v1beta import BetaAnalyticsDataClient
        from google.analytics.data_v1beta.types import (
            DateRange, Dimension, Metric, RunReportRequest,
        )
        from google.oauth2 import service_account
        import base64

        # Decode credentials (support both raw JSON and base64-encoded)
        try:
            creds_dict = json.loads(creds_json)
        except json.JSONDecodeError:
            creds_dict = json.loads(base64.b64decode(creds_json).decode())

        creds  = service_account.Credentials.from_service_account_info(creds_dict)
        client = BetaAnalyticsDataClient(credentials=creds)

        date_range      = DateRange(start_date=str(PERIOD_START), end_date=str(PERIOD_END))
        prev_date_range = DateRange(start_date=str(PREV_START),   end_date=str(PREV_END))

        def run(dimensions: list[str], metrics: list[str], date_ranges=None) -> list[dict]:
            req = RunReportRequest(
                property    = property_id,
                dimensions  = [Dimension(name=d) for d in dimensions],
                metrics     = [Metric(name=m)    for m in metrics],
                date_ranges = date_ranges or [date_range],
            )
            resp = client.run_report(req)
            rows = []
            for row in resp.rows:
                r = {}
                for i, dv in enumerate(row.dimension_values):
                    r[dimensions[i]] = dv.value
                for i, mv in enumerate(row.metric_values):
                    r[metrics[i]] = mv.value
                rows.append(r)
            return rows

        # Core metrics
        core = run(
            dimensions = ["date"],
            metrics    = ["sessions","totalUsers","screenPageViews","bounceRate","averageSessionDuration"],
        )

        # Events
        events = run(
            dimensions = ["eventName"],
            metrics    = ["eventCount","totalUsers"],
        )

        # Pages
        pages = run(
            dimensions = ["pagePath"],
            metrics    = ["screenPageViews","totalUsers"],
        )

        # Countries
        countries = run(
            dimensions = ["country"],
            metrics    = ["totalUsers"],
        )

        # Devices
        devices = run(
            dimensions = ["deviceCategory"],
            metrics    = ["sessions"],
        )

        # Aggregate totals
        totals = {
            "sessions":   sum(int(r.get("sessions", 0))         for r in core),
            "users":      sum(int(r.get("totalUsers", 0))        for r in core),
            "pageviews":  sum(int(r.get("screenPageViews", 0))   for r in core),
        }

        print(f"  [GA4] Collected — pageviews: {totals['pageviews']}, sessions: {totals['sessions']}")
        return {
            "source":     "ga4",
            "totals":     totals,
            "timeseries": core,
            "events":     events,
            "pages":      pages,
            "countries":  countries,
            "devices":    devices,
        }

    except ImportError:
        print("  [GA4] Skipped — google-analytics-data package not installed.")
        return {}
    except Exception as e:
        print(f"  [GA4] Error: {e}")
        return {}


# ── Merge & enrich ────────────────────────────────────────────────────────────

def merge_sources(plausible: dict, ga4: dict) -> dict:
    """Merge data from multiple sources into a unified analytics payload."""

    # Prefer Plausible for primary metrics; fall back to GA4
    if plausible:
        cur  = plausible.get("current", {})
        prev = plausible.get("previous", {})

        def val(d: dict, key: str) -> int:
            return int(d.get(key, {}).get("value", 0))

        def pct_change(curr: int, prev_: int) -> float:
            if prev_ == 0:
                return 0.0
            return round((curr - prev_) / prev_ * 100, 1)

        pv_curr  = val(cur,  "pageviews")
        pv_prev  = val(prev, "pageviews")
        vis_curr = val(cur,  "visitors")
        vis_prev = val(prev, "visitors")

        # Extract custom events
        events_raw = plausible.get("events", [])
        demo_runs  = next((int(e.get("events", 0)) for e in events_raw if e.get("name") == "demo_run"), 0)
        cmd_copies = next((int(e.get("events", 0)) for e in events_raw if e.get("name") == "command_copied"), 0)
        completions= next((int(e.get("events", 0)) for e in events_raw if e.get("name") == "demo_complete"), 0)

        primary = {
            "pageviews":          pv_curr,
            "pageviews_prev":     pv_prev,
            "pageviews_change":   pct_change(pv_curr, pv_prev),
            "visitors":           vis_curr,
            "visitors_prev":      vis_prev,
            "visitors_change":    pct_change(vis_curr, vis_prev),
            "bounce_rate":        cur.get("bounce_rate", {}).get("value", 0),
            "visit_duration_sec": cur.get("visit_duration", {}).get("value", 0),
            "demo_runs":          demo_runs,
            "command_copies":     cmd_copies,
            "demo_completions":   completions,
            "completion_rate":    round(completions / demo_runs * 100, 1) if demo_runs else 0,
        }
    elif ga4:
        totals    = ga4.get("totals", {})
        events_raw = ga4.get("events", [])
        demo_runs  = next((int(e.get("eventCount", 0)) for e in events_raw if e.get("eventName") == "demo_run"), 0)
        cmd_copies = next((int(e.get("eventCount", 0)) for e in events_raw if e.get("eventName") == "command_copied"), 0)
        completions= next((int(e.get("eventCount", 0)) for e in events_raw if e.get("eventName") == "demo_complete"), 0)

        primary = {
            "pageviews":          totals.get("pageviews", 0),
            "pageviews_prev":     0,
            "pageviews_change":   0.0,
            "visitors":           totals.get("users", 0),
            "visitors_prev":      0,
            "visitors_change":    0.0,
            "bounce_rate":        0,
            "visit_duration_sec": 0,
            "demo_runs":          demo_runs,
            "command_copies":     cmd_copies,
            "demo_completions":   completions,
            "completion_rate":    round(completions / demo_runs * 100, 1) if demo_runs else 0,
        }
    else:
        # No analytics source configured — use placeholder zeros
        print("  [Merge] No analytics source configured. Using placeholder data.")
        primary = {
            "pageviews": 0, "pageviews_prev": 0, "pageviews_change": 0.0,
            "visitors":  0, "visitors_prev":  0, "visitors_change":  0.0,
            "bounce_rate": 0, "visit_duration_sec": 0,
            "demo_runs": 0, "command_copies": 0, "demo_completions": 0, "completion_rate": 0.0,
        }

    return {
        "generated_at":  NOW.isoformat(),
        "period_start":  str(PERIOD_START),
        "period_end":    str(PERIOD_END),
        "period_days":   PERIOD_DAYS,
        "demo_page_url": DEMO_PAGE_URL,
        "primary":       primary,
        "plausible":     plausible,
        "ga4":           ga4,
    }


# ── Main ──────────────────────────────────────────────────────────────────────

def main():
    print(f"\n📊 Collecting analytics for {PERIOD_START} → {PERIOD_END} ({PERIOD_DAYS} days)\n")

    plausible = collect_plausible()
    ga4       = collect_ga4()
    data      = merge_sources(plausible, ga4)

    OUTPUT_FILE.write_text(json.dumps(data, indent=2, default=str))
    print(f"\n✅ Data written to {OUTPUT_FILE}")

    # Write quick summary for GitHub Actions step summary
    p = data["primary"]
    summary = f"""
| Metric | This Week | Prev Week | Change |
|--------|-----------|-----------|--------|
| Pageviews | {p['pageviews']:,} | {p['pageviews_prev']:,} | {p['pageviews_change']:+.1f}% |
| Visitors | {p['visitors']:,} | {p['visitors_prev']:,} | {p['visitors_change']:+.1f}% |
| Demo Runs | {p['demo_runs']:,} | — | — |
| Command Copies | {p['command_copies']:,} | — | — |
| Demo Completions | {p['demo_completions']:,} | — | — |
| Completion Rate | {p['completion_rate']:.1f}% | — | — |
"""
    (OUTPUT_DIR / "summary.txt").write_text(summary)
    print(summary)


if __name__ == "__main__":
    main()
