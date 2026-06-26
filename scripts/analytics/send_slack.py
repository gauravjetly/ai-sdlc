"""
send_slack.py
=============
Posts a concise analytics summary to a Slack channel.

Environment variables (GitHub Actions secrets):
  SLACK_BOT_TOKEN   — Slack Bot OAuth token (xoxb-...)
  SLACK_CHANNEL_ID  — Channel ID (e.g. C0XXXXXXXXX)
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime
from pathlib import Path

SLACK_BOT_TOKEN  = os.getenv("SLACK_BOT_TOKEN",  "")
SLACK_CHANNEL_ID = os.getenv("SLACK_CHANNEL_ID", "")
DATA_FILE        = Path("reports/analytics_data.json")


def main():
    if not SLACK_BOT_TOKEN or not SLACK_CHANNEL_ID:
        print("  [Slack] Skipped — SLACK_BOT_TOKEN or SLACK_CHANNEL_ID not set.")
        return

    if not DATA_FILE.exists():
        print("  [Slack] Skipped — analytics data file not found.")
        return

    try:
        from slack_sdk import WebClient
        from slack_sdk.errors import SlackApiError
    except ImportError:
        print("  [Slack] Skipped — slack-sdk package not installed.")
        return

    data = json.loads(DATA_FILE.read_text())
    p    = data.get("primary", {})

    def fmt(n) -> str:
        return f"{int(n):,}"

    def arrow(change: float) -> str:
        if change > 0:  return f":chart_with_upwards_trend: +{change:.1f}%"
        if change < 0:  return f":chart_with_downwards_trend: {change:.1f}%"
        return ":heavy_minus_sign: 0%"

    period_start = data.get("period_start", "")
    period_end   = data.get("period_end",   "")
    demo_url     = data.get("demo_page_url", "https://ai-sdlc.yourdomain.com")

    blocks = [
        {
            "type": "header",
            "text": {
                "type": "plain_text",
                "text": f"📊 AI-SDLC Weekly Analytics — {period_start} → {period_end}",
                "emoji": True,
            },
        },
        {"type": "divider"},
        {
            "type": "section",
            "fields": [
                {"type": "mrkdwn", "text": f"*Pageviews*\n`{fmt(p.get('pageviews',0))}` {arrow(p.get('pageviews_change',0))}"},
                {"type": "mrkdwn", "text": f"*Visitors*\n`{fmt(p.get('visitors',0))}` {arrow(p.get('visitors_change',0))}"},
                {"type": "mrkdwn", "text": f"*Demo Runs*\n`{fmt(p.get('demo_runs',0))}`"},
                {"type": "mrkdwn", "text": f"*Command Copies*\n`{fmt(p.get('command_copies',0))}`"},
                {"type": "mrkdwn", "text": f"*Demo Completions*\n`{fmt(p.get('demo_completions',0))}`"},
                {"type": "mrkdwn", "text": f"*Completion Rate*\n`{p.get('completion_rate',0):.1f}%`"},
            ],
        },
        {"type": "divider"},
        {
            "type": "context",
            "elements": [
                {
                    "type": "mrkdwn",
                    "text": (
                        f":link: <{demo_url}|View Demo Page> · "
                        f":github: <https://github.com/gauravjetly/ai-sdlc/issues?q=label%3Aanalytics-report|Full Report on GitHub> · "
                        f"AI-SDLC v3.0.0"
                    ),
                }
            ],
        },
    ]

    try:
        client   = WebClient(token=SLACK_BOT_TOKEN)
        response = client.chat_postMessage(channel=SLACK_CHANNEL_ID, blocks=blocks)
        print(f"  [Slack] ✅ Posted to channel {SLACK_CHANNEL_ID} — ts {response['ts']}")
    except Exception as e:
        print(f"  [Slack] ❌ Failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
