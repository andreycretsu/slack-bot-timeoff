# 🧪 Quick Test Guide - Test in Slack

## Step 1: Start the Bot

```bash
npm start
```

You should see:
```
⚡️ Slack-PeopleForce Bot is running on port 3000!
📅 Scheduled sync job started
⏰ Starting scheduled sync job (cron: 0 * * * *)
🕐 Running scheduled sync at [timestamp]
🔄 Syncing time-offs to Slack statuses...
```

## Step 2: Get Your ngrok URL

If ngrok is running, get your URL:
```bash
curl http://localhost:4040/api/tunnels | python3 -m json.tool
```

Or check ngrok dashboard: http://localhost:4040

Your URL should look like: `https://xxxxx.ngrok-free.dev`

## Step 3: Configure Slack App Request URL

1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Select your **PeopleForce** app
3. Go to **"Slash Commands"**
4. For `/request-time-off` and `/sync-statuses`:
   - Set **Request URL**: `https://YOUR-NGROK-URL.ngrok-free.dev/slack/events`
   - Click **"Save"**

**Also configure Event Subscriptions (if needed):**
1. Go to **"Event Subscriptions"**
2. Enable Events
3. Set **Request URL**: `https://YOUR-NGROK-URL.ngrok-free.dev/slack/events`
4. Click **"Save Changes"**

## Step 4: Test Automatic Status Updates

The bot runs automatically every hour, but you can also test manually:

### Option A: Wait for Automatic Sync
- Just wait - the bot will sync automatically every hour
- Or restart the bot - it syncs immediately on startup

### Option B: Test with Manual Command (Optional)
In Slack, type: `/sync-statuses`

You should see:
- "🔄 Starting manual sync..."
- Then: "✅ Sync complete! • Updated: X status(es)"

## Step 5: Check Status Updates

1. Go to any employee's Slack profile who has an active time-off
2. Check their status - it should show:
   - **Emoji** (🏖️, 🤒, etc.)
   - **Leave type** (Vacation, Sick Leave, etc.)
   - **"till" + date** (the day after leave ends)

**Example:**
```
🏖️ Vacation till Nov 11
```

This means:
- Employee is on Vacation
- Leave ends on Nov 10
- Status shows "till Nov 11" (day after)

## Step 6: Verify Status Auto-Expires

1. Check status expiration - it should automatically clear after leave ends
2. Status expires at midnight after the end date

## Troubleshooting

### Bot not running?
```bash
npm start
```

### Commands not working?
- Check Request URL in Slack app matches your ngrok URL
- Make sure ngrok is running
- Check bot logs for errors

### Status not updating?
- Check User OAuth Token is set in `.env` (`SLACK_USER_TOKEN`)
- Verify `users.profile:write` scope is in User Token Scopes
- Check bot logs for errors

### Status format wrong?
- Check bot logs to see what status text is being set
- Verify time-off data is correct in PeopleForce

## Expected Behavior

✅ **Working:**
- Bot syncs automatically every hour
- Statuses show emoji, leave type, and "till" date
- Statuses expire automatically after leave ends
- No manual commands needed - fully automatic

❌ **Not working:**
- Statuses not updating
- Wrong format
- Status not expiring

