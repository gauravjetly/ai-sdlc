# AI-SDLC Weekly Analytics Reports

Automated weekly analytics reports for the AI-SDLC demo page, delivered every **Monday at 08:00 UTC** via GitHub Actions.

---

## What the Report Includes

| Section | Details |
|---|---|
| **Pageviews** | Total + week-over-week % change |
| **Visitors** | Unique visitors + week-over-week % change |
| **Demo Runs** | How many times the pipeline demo was executed |
| **Command Copies** | How many times `aisdlc run` was copied |
| **Demo Completions** | Full pipeline completions + completion rate |
| **Avg Session Duration** | How long visitors engage with the page |
| **Bounce Rate** | Single-page visit percentage |
| **Daily Traffic Chart** | Pageviews + visitors over 7 days |
| **Event Breakdown Chart** | All custom events ranked by frequency |
| **Traffic Sources** | Top referrers (GitHub, Twitter, LinkedIn, etc.) |
| **Top Countries** | Geographic distribution |
| **Device Breakdown** | Desktop / Mobile / Tablet split |

---

## Delivery Channels

| Channel | How | Secret Required |
|---|---|---|
| **GitHub Issue** | Auto-created every Monday, previous one closed | None (uses `GITHUB_TOKEN`) |
| **Email (HTML)** | Rich HTML report via SendGrid | `SENDGRID_API_KEY`, `REPORT_TO_EMAIL` |
| **Slack** | Block-kit summary card | `SLACK_BOT_TOKEN`, `SLACK_CHANNEL_ID` |
| **GitHub Actions Artifact** | HTML + Markdown + charts, retained 90 days | None |

---

## Setup: GitHub Repository Secrets

Go to **Settings → Secrets and variables → Actions → New repository secret** and add:

### Analytics Sources (at least one required)

| Secret | Description | Example |
|---|---|---|
| `PLAUSIBLE_API_KEY` | Plausible API key | `plausible_api_key_...` |
| `PLAUSIBLE_SITE_ID` | Your Plausible site domain | `ai-sdlc.yourdomain.com` |
| `PLAUSIBLE_BASE_URL` | Plausible base URL (omit for cloud) | `https://plausible.yourdomain.com` |
| `GA4_PROPERTY_ID` | GA4 property ID | `properties/123456789` |
| `GA4_CREDENTIALS_JSON` | Service account JSON (base64 or raw) | `eyJhbGci...` |

### Delivery (all optional)

| Secret | Description |
|---|---|
| `SENDGRID_API_KEY` | SendGrid API key for email delivery |
| `REPORT_TO_EMAIL` | Recipient(s), comma-separated: `a@x.com,b@x.com` |
| `REPORT_FROM_EMAIL` | Sender address (default: `analytics@yourdomain.com`) |
| `SLACK_BOT_TOKEN` | Slack Bot OAuth token (`xoxb-...`) |
| `SLACK_CHANNEL_ID` | Slack channel ID (`C0XXXXXXXXX`) |
| `DEMO_PAGE_URL` | Full URL of the demo page |

### GA4 Service Account Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → IAM → Service Accounts
2. Create a service account, download the JSON key
3. In GA4 Admin → Property Access Management, add the service account email as **Viewer**
4. Base64-encode the JSON: `base64 -i service-account.json | tr -d '\n'`
5. Add as `GA4_CREDENTIALS_JSON` secret

### Slack Bot Setup

1. Go to [api.slack.com/apps](https://api.slack.com/apps) → Create App → From scratch
2. Add OAuth scope: `chat:write`
3. Install to workspace, copy **Bot User OAuth Token** (`xoxb-...`)
4. Invite the bot to your channel: `/invite @your-bot-name`
5. Copy the channel ID from the channel URL

---

## Manual Trigger

You can run the report at any time from **Actions → Weekly Analytics Report → Run workflow**.

Options:
- **period_days** — Number of days to include (default: 7, use 30 for monthly)
- **send_email** — Whether to send the email (default: true)

---

## GitHub Issue Labels

The workflow automatically creates a label `analytics-report` on first run. Each week's report is posted as a new issue and the previous one is closed, keeping your issues list clean.

---

## Local Testing

```bash
cd /path/to/ai-sdlc

# Install dependencies
pip install -r scripts/analytics/requirements.txt

# Set environment variables
export PLAUSIBLE_API_KEY="your-key"
export PLAUSIBLE_SITE_ID="ai-sdlc.yourdomain.com"
export PERIOD_DAYS=7

# Run
python scripts/analytics/collect_analytics.py
python scripts/analytics/generate_report.py

# Open the report
open reports/weekly_report.html
```
