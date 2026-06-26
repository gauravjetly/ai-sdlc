"""
send_email.py
=============
Sends the weekly HTML report via SendGrid.

Environment variables (GitHub Actions secrets):
  SENDGRID_API_KEY   — SendGrid API key
  REPORT_TO_EMAIL    — Recipient email address (comma-separated for multiple)
  REPORT_FROM_EMAIL  — Sender email address
"""
from __future__ import annotations

import os
import sys
from pathlib import Path

SENDGRID_API_KEY  = os.getenv("SENDGRID_API_KEY", "")
REPORT_TO_EMAIL   = os.getenv("REPORT_TO_EMAIL",  "")
REPORT_FROM_EMAIL = os.getenv("REPORT_FROM_EMAIL", "analytics@yourdomain.com")
HTML_FILE         = Path("reports/weekly_report.html")
MD_FILE           = Path("reports/weekly_report.md")


def main():
    if not SENDGRID_API_KEY:
        print("  [Email] Skipped — SENDGRID_API_KEY not set.")
        return

    if not REPORT_TO_EMAIL:
        print("  [Email] Skipped — REPORT_TO_EMAIL not set.")
        return

    try:
        from sendgrid import SendGridAPIClient
        from sendgrid.helpers.mail import Mail, To
    except ImportError:
        print("  [Email] Skipped — sendgrid package not installed.")
        return

    if not HTML_FILE.exists():
        print("  [Email] Skipped — HTML report file not found.")
        return

    html_content = HTML_FILE.read_text()

    # Support multiple recipients
    recipients = [e.strip() for e in REPORT_TO_EMAIL.split(",") if e.strip()]

    # Derive subject from first line of markdown
    subject = "📊 AI-SDLC Weekly Analytics Report"
    if MD_FILE.exists():
        first_line = MD_FILE.read_text().split("\n")[0]
        if first_line.startswith("# "):
            subject = first_line[2:].strip()

    message = Mail(
        from_email    = REPORT_FROM_EMAIL,
        to_emails     = [To(email=r) for r in recipients],
        subject       = subject,
        html_content  = html_content,
    )

    try:
        sg       = SendGridAPIClient(SENDGRID_API_KEY)
        response = sg.send(message)
        print(f"  [Email] ✅ Sent to {len(recipients)} recipient(s) — status {response.status_code}")
    except Exception as e:
        print(f"  [Email] ❌ Failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
