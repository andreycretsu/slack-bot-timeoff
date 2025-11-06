# 🔔 PeopleForce Webhook Setup Guide

## Real-Time Updates with Webhooks

The bot now supports **two ways** to sync statuses:

1. **Scheduled Sync** (every 15 minutes) - Automatic fallback
2. **Webhook Updates** (real-time) - Instant updates when leaves change

## Option 1: Webhooks (Recommended - Real-Time)

### Setup in PeopleForce

1. Go to your PeopleForce account: `https://demo.stage-81y92gtmor-peopleforce.dev`
2. Navigate to **Settings → Webhooks**
3. Click **"Add new webhook"**
4. Configure:
   - **Name**: `Slack Status Sync`
   - **Payload URL**: `https://YOUR-NGROK-URL.ngrok-free.dev/webhook/peopleforce`
     - Example: `https://sketchable-britney-hypnologic.ngrok-free.dev/webhook/peopleforce`
   - **Topics** (select these):
     - ✅ `leave_request.created`
     - ✅ `leave_request.approved`
     - ✅ `leave_request.rejected`
     - ✅ `leave_request.withdrawn`
     - ✅ `leave_request.deleted` (if available)
5. Click **"Save"**

### Benefits

- ✅ **Real-time updates** - Status changes instantly when leave is approved/rejected
- ✅ **No delay** - Updates happen immediately, not every 15 minutes
- ✅ **Efficient** - Only syncs when something actually changes

## Option 2: Scheduled Sync (Fallback)

The bot also runs a **scheduled sync every 15 minutes** as a fallback:

- Ensures statuses are always up-to-date even if webhooks fail
- Runs automatically - no configuration needed
- Syncs all active time-offs every 15 minutes

## How It Works

### With Webhooks:
1. Leave request created/approved/rejected in PeopleForce
2. PeopleForce sends webhook to your bot
3. Bot immediately syncs and updates Slack statuses
4. Status updates in real-time! ⚡

### Without Webhooks (Scheduled Only):
1. Bot checks for changes every 15 minutes
2. Updates statuses for all active time-offs
3. Clears statuses for canceled/deleted leaves

## Testing Webhooks

### 1. Start the Bot

```bash
npm start
```

You should see:
```
✅ Webhook endpoint configured: /webhook/peopleforce
🔔 Webhook endpoint: http://localhost:3000/webhook/peopleforce
```

### 2. Test Webhook Endpoint

Use your ngrok URL (e.g., `https://sketchable-britney-hypnologic.ngrok-free.dev`):

```bash
curl -X POST https://YOUR-NGROK-URL.ngrok-free.dev/webhook/peopleforce \
  -H "Content-Type: application/json" \
  -d '{"event": "leave_request.approved", "data": {}}'
```

### 3. Check Bot Logs

When a webhook is received, you'll see:
```
🔔 Received PeopleForce webhook: {...}
🔄 Triggering sync due to webhook event...
```

## Troubleshooting

### Webhook not working?
- Check ngrok is running and accessible
- Verify webhook URL in PeopleForce matches your ngrok URL
- Check bot logs for webhook errors
- Make sure the endpoint is `/webhook/peopleforce`

### Still using scheduled sync?
- That's fine! It still works every 15 minutes
- Webhooks are optional but recommended for real-time updates

## Summary

✅ **Best Setup**: Use both webhooks (real-time) + scheduled sync (fallback)
- Webhooks for instant updates
- Scheduled sync as backup every 15 minutes

✅ **Simple Setup**: Just use scheduled sync
- Works automatically every 15 minutes
- No webhook configuration needed

