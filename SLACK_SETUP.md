# 🎯 Slack App Setup Guide

## Quick Answer: Do You Need to Set Up the Modal?

**NO!** The modal is created automatically by the code. You just need to:
1. ✅ Register the slash command in Slack (so Slack knows where to send requests)
2. ✅ Enable Interactivity (so modals can work)
3. ✅ That's it!

## Step-by-Step Setup

### 1. Create/Configure Your Slack App

Go to: https://api.slack.com/apps

1. Click **"Create New App"** → **"From scratch"**
2. Name your app (e.g., "Time Off Bot")
3. Select your workspace
4. Click **"Create App"**

### 2. Configure OAuth & Permissions

**Go to:** "OAuth & Permissions" in the sidebar

**Bot Token Scopes** (add these):
- `commands` - For slash commands
- `chat:write` - To send messages
- `users:read` - To read user info
- `users:read.email` - To get user emails
- `users.profile:write` - To update user statuses

**User Token Scopes** (add these):
- `users.profile:write` - REQUIRED for status updates
- `users:read` - To read user info

**Then:**
1. Scroll up and click **"Install to Workspace"**
2. Copy the **Bot User OAuth Token** (`xoxb-...`) → add to `.env` as `SLACK_BOT_TOKEN`
3. Copy the **User OAuth Token** (`xoxp-...`) → add to `.env` as `SLACK_USER_TOKEN`

### 3. Get Signing Secret

**Go to:** "Basic Information" in the sidebar

1. Scroll down to **"App Credentials"**
2. Copy the **Signing Secret** → add to `.env` as `SLACK_SIGNING_SECRET`

### 4. Register the Slash Command ⚠️ THIS IS REQUIRED

**Go to:** "Slash Commands" in the sidebar

1. Click **"Create New Command"**
2. Fill in:
   - **Command**: `/request-time-off`
   - **Request URL**: `https://your-server-url.com/slack/events` 
     - For local testing with ngrok: `https://your-ngrok-url.ngrok-free.dev/slack/events`
     - For Render: `https://your-app.onrender.com/slack/events`
   - **Short Description**: `Request time off from PeopleForce`
   - **Usage Hint**: (leave empty or add hints)
3. Click **"Save"**

**Create second command:**
1. Click **"Create New Command"** again
2. Fill in:
   - **Command**: `/sync-statuses`
   - **Request URL**: Same as above
   - **Short Description**: `Manually sync time-off statuses`
3. Click **"Save"**

### 5. Enable Interactivity ⚠️ THIS IS REQUIRED FOR MODALS

**Go to:** "Interactivity & Shortcuts" in the sidebar

1. Toggle **"Interactivity"** to **On**
2. Set **Request URL** to: `https://your-server-url.com/slack/events` (same as above)
3. Click **"Save Changes"**

**Why?** This allows Slack to send modal interactions (like when someone clicks "Submit" in the modal) back to your bot.

### 6. That's It! 🎉

The modal is created automatically by your code. When someone types `/request-time-off`:
1. Slack sends the command to your bot
2. Your bot creates the modal dynamically
3. User fills it out and submits
4. Your bot receives the submission and creates the time-off request

## How It Works

```
User types /request-time-off in Slack
    ↓
Slack sends command to your bot (at /slack/events)
    ↓
Your code (index.js) creates the modal dynamically
    ↓
User sees modal with fields (leave type, dates, comment)
    ↓
User clicks "Submit"
    ↓
Slack sends submission to your bot (via Interactivity)
    ↓
Your code creates the time-off request in PeopleForce
    ↓
User gets confirmation message
```

## What URL Should I Use?

### For Local Testing (ngrok):
1. Start your bot: `npm start`
2. Start ngrok: `ngrok http 3000`
3. Copy the HTTPS URL (e.g., `https://abc123.ngrok-free.dev`)
4. Use: `https://abc123.ngrok-free.dev/slack/events`

### For Production (Render/Heroku/etc):
1. Deploy your bot (see DEPLOY_TO_RENDER.md)
2. Get your URL (e.g., `https://your-app.onrender.com`)
3. Use: `https://your-app.onrender.com/slack/events`

## Troubleshooting

### "Command not found" when typing `/request-time-off`
- ✅ Make sure you registered the slash command in Slack app settings
- ✅ Make sure the Request URL is correct
- ✅ Make sure your bot is running and accessible

### Modal doesn't open
- ✅ Make sure Interactivity is enabled
- ✅ Make sure the Request URL in "Interactivity & Shortcuts" matches your server
- ✅ Check your bot logs for errors

### "dispatch_failed" error
- ✅ Make sure your bot responds to the command quickly (acknowledges within 3 seconds)
- ✅ Check your bot logs for errors
- ✅ Make sure the Request URL is accessible from the internet

