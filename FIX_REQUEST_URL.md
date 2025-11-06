# 🔴 CRITICAL: Fix Request URL Issue

## The Problem

Your Render logs show:
```
[INFO] Unhandled HTTP request (POST) made to /
```

This means Slack is sending requests to the **root URL** (`/`) instead of `/slack/events`.

## The Fix

### Check Your Slack App Request URLs

1. **Go to:** https://api.slack.com/apps
2. **Select your app** (PeopleForce)
3. **Check these URLs:**

#### 1. Slash Commands
- Go to: **"Slash Commands"** → `/request-time-off`
- **Request URL MUST be:** `https://slack-bot-timeoff.onrender.com/slack/events`
- ❌ NOT: `https://slack-bot-timeoff.onrender.com/`
- ❌ NOT: `https://slack-bot-timeoff.onrender.com`

#### 2. Interactivity & Shortcuts
- Go to: **"Interactivity & Shortcuts"**
- **Request URL MUST be:** `https://slack-bot-timeoff.onrender.com/slack/events`
- ❌ NOT: `https://slack-bot-timeoff.onrender.com/`
- ❌ NOT: `https://slack-bot-timeoff.onrender.com`

#### 3. Event Subscriptions (if enabled)
- Go to: **"Event Subscriptions"**
- **Request URL MUST be:** `https://slack-bot-timeoff.onrender.com/slack/events`

## What to Look For

### ✅ CORRECT:
```
https://slack-bot-timeoff.onrender.com/slack/events
```

### ❌ WRONG:
```
https://slack-bot-timeoff.onrender.com
https://slack-bot-timeoff.onrender.com/
```

## After Fixing

1. **Save the changes** in Slack app settings
2. **Wait 30 seconds** for Slack to update
3. **Try `/request-time-off` again** in Slack
4. **Check Render logs** - you should now see:
   ```
   📝 Received /request-time-off from user U1234567890
   ✅ Command acknowledged for user U1234567890
   ```

## Why This Happens

Slack Bolt automatically handles requests at `/slack/events`. If you set the Request URL to just the root domain (`https://slack-bot-timeoff.onrender.com`), Slack sends POST requests to `/` which Bolt doesn't handle by default.

The correct endpoint is `/slack/events` which Bolt sets up automatically.

