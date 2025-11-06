# Setup Complete! ✅

## What's Been Fixed

### 1. ✅ Slack Status Updates - USER TOKEN SUPPORT
- **Problem**: Bot tokens cannot update other users' statuses
- **Solution**: Added support for User OAuth Token
- **Code Changes**:
  - Added `userClient` with user token support
  - Updated `updateSlackStatus()` to use user token when available
  - Added fallback to bot token if user token not provided

### 2. ✅ Updated README
- Added instructions for getting User OAuth Token
- Added troubleshooting section for status updates
- Added notes about PeopleForce API endpoint variations

### 3. ✅ Environment Variables
- Added `SLACK_USER_TOKEN` support in `.env`

## What You Need To Do Next

### Step 1: Get User OAuth Token (REQUIRED for status updates)

1. Go to https://api.slack.com/apps → Your App
2. Click **"OAuth & Permissions"**
3. Scroll to **"User Token Scopes"**
4. Click **"Add an OAuth Scope"**
5. Add: `users.profile:write`
6. Click **"Install to Workspace"** (or **"Reinstall to Workspace"**)
7. Copy the **User OAuth Token** (starts with `xoxp-`)
8. Add to `.env`:
   ```
   SLACK_USER_TOKEN=xoxp-your-user-token-here
   ```

### Step 2: Fix PeopleForce API Endpoints

The current endpoints are returning 404. You need to:

1. **Check PeopleForce API Documentation**:
   - Go to: https://developer.peopleforce.io/docs/getting-started
   - Find the correct endpoint paths for:
     - Getting employees
     - Getting time-offs/leaves
     - Creating time-off requests

2. **Common endpoint variations to try**:
   - `/api/v1/leaves` instead of `/api/v1/time_offs`
   - `/api/v2/employees` instead of `/api/v1/employees`
   - Check if authentication method is different (Bearer token vs X-API-KEY)

3. **Update `peopleforce.js`** if endpoints are different:
   - Edit the endpoint paths in `peopleforce.js`
   - Or update `PEOPLEFORCE_API_URL` in `.env`

### Step 3: Test the Bot

Once you have the User Token:

```bash
# Restart the bot
npm start
```

Then test with:
- `/sync-statuses` command in Slack
- Or wait for the scheduled sync (runs daily at 9 AM)

## Current Status

✅ **Working**:
- Bot connects to Slack
- Bot can read user information
- Bot can send messages
- Code supports user tokens for status updates
- Slash commands work

⚠️ **Needs Setup**:
- User OAuth Token (see Step 1 above)
- Correct PeopleForce API endpoints (see Step 2 above)

## Testing

After setting up the User Token, you can test status updates with:

```bash
node testStatusUpdate.js
```

This will try to update a test user's status. If it works, you'll see the status in Slack!

## Questions?

- Slack API: https://api.slack.com/docs
- PeopleForce API: https://developer.peopleforce.io/docs/getting-started

