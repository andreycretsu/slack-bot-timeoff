# 🔍 Debug Render Logs

## How to Check Render Logs

1. Go to https://dashboard.render.com
2. Click on your service (e.g., `slack-bot-timeoff`)
3. Click on **"Logs"** tab
4. You'll see real-time logs

## Common Issues & Fixes

### 1. Bot Not Starting

**Check for:**
```
❌ Failed to start bot: Error: ...
```

**Common causes:**
- Missing environment variables
- Invalid token/secret
- Port already in use

**Fix:**
- Check all environment variables are set in Render
- Verify `SLACK_BOT_TOKEN`, `SLACK_SIGNING_SECRET`, `SLACK_USER_TOKEN` are set
- Check `PEOPLEFORCE_API_KEY` and `PEOPLEFORCE_API_URL` are set

### 2. "Cannot GET /slack/events" Error

**Check for:**
```
GET /slack/events 404
```

**Cause:** Slack Bolt app might not be handling the route correctly

**Fix:** This shouldn't happen with Bolt - it handles `/slack/events` automatically. If you see this, check:
- Is the bot actually running? (Look for "⚡️ Slack-PeopleForce Bot is running on port...")
- Are there any startup errors?

### 3. "dispatch_failed" Error in Slack

**Check Render logs for:**
```
Error acknowledging command: ...
Error opening time-off modal: ...
```

**Common causes:**
- Bot not responding within 3 seconds
- Invalid trigger_id
- Missing scopes

**Fix:**
- Check if bot is running and responding
- Verify OAuth scopes are correct
- Check bot token is valid

### 4. Timeout or Connection Errors

**Check for:**
```
ECONNRESET
ETIMEDOUT
Error fetching time-off types: ...
```

**Causes:**
- PeopleForce API is slow/down
- Network issues
- Invalid API key/URL

**Fix:**
- Verify `PEOPLEFORCE_API_KEY` is correct
- Check `PEOPLEFORCE_API_URL` is correct (should be `https://demo.stage-81y92gtmor-peopleforce.dev/api/public/v3`)
- Test API key manually

### 5. No Logs at All (Bot Not Running)

**Check for:**
- Is the service "Live" or "Stopped"?
- Was there a build error?
- Check "Events" tab for deployment errors

**Fix:**
- Restart the service
- Check "Build Logs" for errors
- Verify `package.json` and `index.js` are correct

## What to Look For in Logs

### ✅ Good Signs:
```
⚡️ Slack-PeopleForce Bot is running on port 3000!
📅 Scheduled sync job started (every 15 minutes)
🔔 Webhook endpoint: http://localhost:3000/webhook/peopleforce
```

### ❌ Bad Signs:
```
❌ Failed to start bot: ...
Error: ...
Cannot find module ...
Missing environment variable: ...
```

## Quick Debug Steps

1. **Check Service Status:**
   - Render Dashboard → Your Service
   - Is it "Live" (green) or "Stopped" (red)?

2. **Check Environment Variables:**
   - Render Dashboard → Your Service → "Environment"
   - Verify all are set:
     - `SLACK_BOT_TOKEN`
     - `SLACK_USER_TOKEN`
     - `SLACK_SIGNING_SECRET`
     - `PEOPLEFORCE_API_KEY`
     - `PEOPLEFORCE_API_URL`
     - `PORT` (optional, defaults to 3000)

3. **Test the Endpoint:**
   - Try: `https://slack-bot-timeoff.onrender.com/slack/events`
   - Should return something (not a 404)

4. **Check Slack App Settings:**
   - Request URL: `https://slack-bot-timeoff.onrender.com/slack/events`
   - Interactivity enabled: ON
   - Request URL: `https://slack-bot-timeoff.onrender.com/slack/events`

## Test Command

Try typing `/request-time-off` in Slack and immediately check Render logs. You should see:
```
📝 Received /request-time-off from user U1234567890
```

If you DON'T see this, the Request URL might be wrong or the bot isn't receiving requests.

