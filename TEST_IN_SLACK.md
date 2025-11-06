# 🧪 How to Test the Bot in Slack

## Prerequisites

✅ Make sure you have:
- Bot running (`npm start`)
- ngrok running (to expose your local server)
- Slack app configured with correct Request URL

## Step 1: Start the Bot

```bash
npm start
```

You should see:
```
⚡️ Slack-PeopleForce Bot is running on port 3000!
📅 Scheduled sync job started
```

## Step 2: Verify ngrok is Running

Your ngrok URL should be:
```
https://sketchable-britney-hypnologic.ngrok-free.dev
```

## Step 3: Configure Slack App Request URL

1. Go to [Slack API Apps](https://api.slack.com/apps)
2. Select your **PeopleForce** app
3. Go to **"Slash Commands"**
4. For each command (`/request-time-off` and `/sync-statuses`), set:
   - **Request URL**: `https://sketchable-britney-hypnologic.ngrok-free.dev/slack/events`
5. Save the changes

**Also configure Event Subscriptions:**
1. Go to **"Event Subscriptions"**
2. Enable Events
3. Set **Request URL**: `https://sketchable-britney-hypnologic.ngrok-free.dev/slack/events`
4. Subscribe to events if needed

## Step 4: Test in Slack

### Test 1: Request Time Off

1. In Slack, type: `/request-time-off`
2. A modal should open with:
   - Leave Type dropdown
   - Start Date picker
   - End Date picker
   - Comment field (optional)
3. Fill in the form and click **"Submit"**
4. You should see a confirmation message

### Test 2: Sync Statuses

1. In Slack, type: `/sync-statuses`
2. The bot will:
   - Fetch active time-offs from PeopleForce
   - Update Slack statuses for employees on leave
3. You should see a message like:
   ```
   ✅ Sync complete!
   • Updated: X status(es)
   • Errors: 0
   ```

### Test 3: Check Status Updates

1. After running `/sync-statuses`, check employee profiles in Slack
2. Employees with active time-offs should have:
   - Status emoji (🏖️, 🤒, etc.)
   - Status text showing leave type and dates
   - Status expiration set to end of leave

## Troubleshooting

### Bot not responding?
- Check if bot is running: `ps aux | grep "node.*index.js"`
- Check ngrok is running: `pgrep -f ngrok`
- Check bot logs for errors

### Commands not working?
- Verify Request URL in Slack app settings matches your ngrok URL
- Make sure slash commands are saved in Slack app
- Check bot logs for errors

### Status updates not working?
- Verify User OAuth Token is set in `.env` (`SLACK_USER_TOKEN`)
- Check that `users.profile:write` scope is in User Token Scopes
- Check bot logs for errors

## Expected Results

✅ **Working:**
- `/request-time-off` opens modal
- Form submission creates time-off in PeopleForce
- `/sync-statuses` updates Slack statuses
- Statuses show emoji and leave type
- Statuses expire automatically

❌ **Not working:**
- Commands return "unknown command"
- Modal doesn't open
- Status updates fail
- Bot doesn't respond

