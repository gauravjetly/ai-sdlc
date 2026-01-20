#!/bin/bash
# SDLC Notifications Script
# Sends notifications to Slack, Teams, or email for SDLC events

CONFIG_FILE="$HOME/.claude/notifications-config.json"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

usage() {
    echo "SDLC Notifications Manager"
    echo ""
    echo "Usage: $0 <command> [options]"
    echo ""
    echo "Commands:"
    echo "  configure                     Interactive configuration setup"
    echo "  set-slack <webhook-url>       Configure Slack webhook"
    echo "  set-teams <webhook-url>       Configure Teams webhook"
    echo "  set-email <email>             Configure email recipient"
    echo "  test                          Send test notification"
    echo "  send <type> <message>         Send notification"
    echo "  status                        Show configuration status"
    echo ""
    echo "Notification Types:"
    echo "  started    - SDLC workflow started"
    echo "  completed  - SDLC workflow completed"
    echo "  blocked    - Phase blocked (requires attention)"
    echo "  budget     - Budget warning/alert"
    echo "  error      - Error occurred"
    echo ""
    echo "Examples:"
    echo "  $0 set-slack https://hooks.slack.com/services/XXX/YYY/ZZZ"
    echo "  $0 send blocked 'Security review blocked: 2 critical vulnerabilities'"
    echo "  $0 test"
}

# Initialize config if not exists
init_config() {
    if [ ! -f "$CONFIG_FILE" ]; then
        mkdir -p "$(dirname "$CONFIG_FILE")"
        cat > "$CONFIG_FILE" <<EOF
{
  "slack": {
    "enabled": false,
    "webhookUrl": ""
  },
  "teams": {
    "enabled": false,
    "webhookUrl": ""
  },
  "email": {
    "enabled": false,
    "recipient": ""
  },
  "preferences": {
    "notifyOnStart": true,
    "notifyOnComplete": true,
    "notifyOnBlocked": true,
    "notifyOnBudgetWarning": true,
    "notifyOnError": true
  }
}
EOF
    fi
}

# Read config value
read_config() {
    local key=$1
    python3 -c "import json; print(json.load(open('$CONFIG_FILE')).get('$key', {}))" 2>/dev/null
}

# Set Slack webhook
set_slack() {
    local webhook=$1
    init_config

    python3 -c "
import json
with open('$CONFIG_FILE', 'r') as f:
    config = json.load(f)
config['slack']['enabled'] = True
config['slack']['webhookUrl'] = '$webhook'
with open('$CONFIG_FILE', 'w') as f:
    json.dump(config, f, indent=2)
"
    echo -e "${GREEN}✓${NC} Slack webhook configured"
}

# Set Teams webhook
set_teams() {
    local webhook=$1
    init_config

    python3 -c "
import json
with open('$CONFIG_FILE', 'r') as f:
    config = json.load(f)
config['teams']['enabled'] = True
config['teams']['webhookUrl'] = '$webhook'
with open('$CONFIG_FILE', 'w') as f:
    json.dump(config, f, indent=2)
"
    echo -e "${GREEN}✓${NC} Teams webhook configured"
}

# Set email
set_email() {
    local email=$1
    init_config

    python3 -c "
import json
with open('$CONFIG_FILE', 'r') as f:
    config = json.load(f)
config['email']['enabled'] = True
config['email']['recipient'] = '$email'
with open('$CONFIG_FILE', 'w') as f:
    json.dump(config, f, indent=2)
"
    echo -e "${GREEN}✓${NC} Email recipient configured: $email"
}

# Send Slack notification
send_slack() {
    local type=$1
    local message=$2
    local webhook=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['slack']['webhookUrl'])" 2>/dev/null)

    if [ -z "$webhook" ]; then
        return 1
    fi

    local color="#36a64f"
    local emoji=":white_check_mark:"

    case $type in
        blocked)
            color="#ff0000"
            emoji=":x:"
            ;;
        budget)
            color="#ffcc00"
            emoji=":warning:"
            ;;
        error)
            color="#ff0000"
            emoji=":rotating_light:"
            ;;
        started)
            color="#0066cc"
            emoji=":rocket:"
            ;;
    esac

    local payload=$(cat <<EOF
{
  "attachments": [
    {
      "color": "$color",
      "blocks": [
        {
          "type": "section",
          "text": {
            "type": "mrkdwn",
            "text": "$emoji *AI-SDLC Notification*\\n$message"
          }
        },
        {
          "type": "context",
          "elements": [
            {
              "type": "mrkdwn",
              "text": "Type: *$type* | $(date '+%Y-%m-%d %H:%M:%S')"
            }
          ]
        }
      ]
    }
  ]
}
EOF
)

    curl -s -X POST -H 'Content-type: application/json' --data "$payload" "$webhook" > /dev/null 2>&1
    return $?
}

# Send Teams notification
send_teams() {
    local type=$1
    local message=$2
    local webhook=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['teams']['webhookUrl'])" 2>/dev/null)

    if [ -z "$webhook" ]; then
        return 1
    fi

    local color="00ff00"
    case $type in
        blocked|error) color="ff0000" ;;
        budget) color="ffcc00" ;;
        started) color="0066cc" ;;
    esac

    local payload=$(cat <<EOF
{
  "@type": "MessageCard",
  "@context": "http://schema.org/extensions",
  "themeColor": "$color",
  "summary": "AI-SDLC: $type",
  "sections": [{
    "activityTitle": "AI-SDLC Notification",
    "facts": [{
      "name": "Type",
      "value": "$type"
    }, {
      "name": "Message",
      "value": "$message"
    }, {
      "name": "Time",
      "value": "$(date '+%Y-%m-%d %H:%M:%S')"
    }]
  }]
}
EOF
)

    curl -s -X POST -H 'Content-type: application/json' --data "$payload" "$webhook" > /dev/null 2>&1
    return $?
}

# Send notification to all configured channels
send_notification() {
    local type=$1
    local message=$2

    init_config

    local slack_enabled=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['slack']['enabled'])" 2>/dev/null)
    local teams_enabled=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['teams']['enabled'])" 2>/dev/null)

    local sent=0

    if [ "$slack_enabled" = "True" ]; then
        if send_slack "$type" "$message"; then
            echo -e "${GREEN}✓${NC} Sent to Slack"
            sent=1
        fi
    fi

    if [ "$teams_enabled" = "True" ]; then
        if send_teams "$type" "$message"; then
            echo -e "${GREEN}✓${NC} Sent to Teams"
            sent=1
        fi
    fi

    if [ $sent -eq 0 ]; then
        echo -e "${YELLOW}⚠${NC} No notification channels configured"
        echo "  Run: $0 set-slack <webhook-url>"
        echo "  Or:  $0 set-teams <webhook-url>"
    fi

    # Log notification
    echo "[$(date)] [$type] $message" >> "$HOME/.claude/notifications.log"
}

# Test notification
test_notification() {
    echo -e "${BLUE}Sending test notification...${NC}"
    send_notification "completed" "This is a test notification from AI-SDLC"
}

# Show status
show_status() {
    init_config

    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}                 Notification Configuration                     ${NC}"
    echo -e "${BLUE}═══════════════════════════════════════════════════════════════${NC}"
    echo ""

    local slack_enabled=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['slack']['enabled'])" 2>/dev/null)
    local teams_enabled=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['teams']['enabled'])" 2>/dev/null)
    local email_enabled=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['email']['enabled'])" 2>/dev/null)

    if [ "$slack_enabled" = "True" ]; then
        echo -e "  Slack:  ${GREEN}✓ Enabled${NC}"
    else
        echo -e "  Slack:  ${RED}✗ Disabled${NC}"
    fi

    if [ "$teams_enabled" = "True" ]; then
        echo -e "  Teams:  ${GREEN}✓ Enabled${NC}"
    else
        echo -e "  Teams:  ${RED}✗ Disabled${NC}"
    fi

    if [ "$email_enabled" = "True" ]; then
        local recipient=$(python3 -c "import json; print(json.load(open('$CONFIG_FILE'))['email']['recipient'])" 2>/dev/null)
        echo -e "  Email:  ${GREEN}✓ Enabled${NC} ($recipient)"
    else
        echo -e "  Email:  ${RED}✗ Disabled${NC}"
    fi

    echo ""
    echo "Config file: $CONFIG_FILE"
}

# Main
case "$1" in
    set-slack)
        set_slack "$2"
        ;;
    set-teams)
        set_teams "$2"
        ;;
    set-email)
        set_email "$2"
        ;;
    send)
        send_notification "$2" "$3"
        ;;
    test)
        test_notification
        ;;
    status)
        show_status
        ;;
    *)
        usage
        ;;
esac
