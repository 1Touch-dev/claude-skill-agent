# Slack Integration — Platform Hub

**Branch:** `feature/platform-github-slack`  
**App name:** Globex Platform (Kyma workspace)  
**App ID:** `A0B9XTZS33M`  
**Status:** Outbound notifications **live**; Event Subscriptions **enabled** (`app_mention`, app reinstalled)  
**Related:** [integration-github.md](integration-github.md) · [12th_June.md](../memory/12th_June.md)

---

## Overview

Plane CE does **not** include native Slack integration. Our platform posts to Slack and (optionally) receives Events API callbacks.

```
Route task / status change
    │
    ▼
Platform API
    └── Slack Web API (chat.postMessage / postReply)
            └── #server-alerts (SLACK_DEFAULT_CHANNEL)

Slack Events API (optional inbound)
    │ POST /webhooks/slack
    ▼
Platform API → integration_events log
```

---

## What works today

| Capability | Status |
|------------|--------|
| Live connection test | ✅ `auth.test` via Integrations UI |
| Post on `POST /api/route/apply` | ✅ task routed message + Plane link |
| Thread reply on Plane status change | ✅ when `slack_thread_ts` stored |
| Thread reply on GitHub PR status change | ✅ |
| `POST /webhooks/slack` URL verification | ✅ tested from EC2 |
| Inbound message handling | ❌ stub only (logs to `integration_events`) |
| Event Subscriptions enabled in Slack app | ✅ URL verified + `app_mention` subscribed |

---

## Credentials (already on EC2)

| Variable | Purpose |
|----------|---------|
| `SLACK_BOT_TOKEN` | Bot User OAuth Token (`xoxb-...`) — post messages |
| `SLACK_SIGNING_SECRET` | Verify Events API requests (not needed for url_verification) |
| `SLACK_DEFAULT_CHANNEL` | Channel ID (e.g. `#server-alerts`) |

### How credentials were created

1. https://api.slack.com/apps → **Create New App** → From scratch  
2. App name: **Globex Platform**, workspace: **Kyma**  
3. **OAuth & Permissions** → Bot Token Scopes: `chat:write`, `channels:read` (and `channels:history` if needed)  
4. **Install to Workspace** → copy **Bot User OAuth Token** → `SLACK_BOT_TOKEN`  
5. **Basic Information** → **Signing Secret** → `SLACK_SIGNING_SECRET`  
6. Invite bot to channel: `/invite @Globex Platform` in `#server-alerts`  
7. Channel ID from Slack (right-click channel → View channel details) → `SLACK_DEFAULT_CHANNEL`

---

## Event Subscriptions (enabled)

### Exact steps (Slack API website)

1. Open: **https://api.slack.com/apps/A0B9XTZS33M/event-subscriptions**
2. Under **Enable Events**, toggle **Off → On**
3. In **Request URL**, enter:

   ```
   http://54.167.31.169:3000/webhooks/slack
   ```

4. Slack sends a `url_verification` challenge — wait until you see **Verified ✓**
5. Expand **Subscribe to bot events** → **Add Bot User Event** → add at least one event (e.g. `app_mention`)
6. **Save Changes** only becomes clickable after step 5 — Slack disables it if you only verify the URL
7. Click **Save Changes** at the bottom
8. **Reinstall app** when Slack shows the yellow banner (new `app_mentions:read` scope)

### Verify manually

```bash
curl -sS -X POST "http://54.167.31.169:3000/webhooks/slack" \
  -H "Content-Type: application/json" \
  -d '{"type":"url_verification","challenge":"test-123"}'
# Expected: {"challenge":"test-123"}
```

---

## Notification flow (demo)

1. Create task in **Routing Demo** → **Route & Apply**
2. Platform creates Plane work item (if pm-bridge enabled)
3. Slack message appears in `#server-alerts` with task title, agent, Plane link
4. `task_intake.slack_channel_id` and `slack_message_ts` are saved
5. Change work item in Plane → webhook → Slack **thread reply**
6. Merge PR with `task-{id}` in branch → GitHub webhook → Slack **thread reply**

---

## API and code references

| Area | Location |
|------|----------|
| Slack service | `backend/src/services/slack/index.js` |
| Route notify | `backend/src/routes/routing.js` |
| Webhook receiver | `backend/src/routes/webhooks.js` → `POST /slack` |
| Block Kit builders | `buildTaskRoutedMessage`, `buildTaskStatusMessage` |

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| No Slack message after routing | Check `SLACK_BOT_TOKEN`, `SLACK_DEFAULT_CHANNEL`; bot invited to channel |
| `channel_not_found` | Wrong channel ID or bot not in channel |
| Event Subscriptions won't verify | Port 3000 must be reachable from internet; backend running |
| **Save Changes greyed out / won't click** | If you haven't saved yet: add at least one bot event first, then Save. If **both** Save and Discard are greyed out and URL shows Verified: **already saved** — nothing more to click |
| 401 on non-verification events | `SLACK_SIGNING_SECRET` mismatch |
| Thread replies missing | Task needs `slack_message_ts` from initial routed message |

---

## Free vs paid Slack

**Free workspace is sufficient** for bot posting and Event Subscriptions in a single workspace. Paid plans add message history limits and enterprise features — not required for this MVP.

---

## Test script

```bash
bash scripts/test-integrations.sh http://localhost:3000
```

---

*Outbound Slack works without Event Subscriptions. Enable Events when you want inbound Slack → platform events.*
