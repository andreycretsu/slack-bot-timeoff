# Slack-PeopleForce Time Off Bot

A Slack app that syncs PeopleForce time-off data with Slack user statuses. Employees can request time off directly from Slack, and their status will automatically update when they're on leave.

## What You Need

**Slack App vs Bot User**: In Slack terminology, you create a **"Slack App"** (the overall application), which automatically includes a **"Bot User"** (the background service that handles commands and updates). You don't need to choose between them - when you create a Slack App "from scratch", it includes a Bot User by default. This bot runs in the background and doesn't need to be visible in channels.

## Features

- ✅ **Request Time Off from Slack**: Use `/request-time-off` command to submit leave requests directly from Slack
- ✅ **Automatic Status Updates**: Slack statuses automatically update with emoji and leave type when employees are on approved time off
- ✅ **Auto-Expiration**: Statuses automatically clear after the leave period ends
- ✅ **Smart Emoji Mapping**: Different emojis for different leave types (🏖️ vacation, 🤒 sick leave, etc.)

## Prerequisites

- Node.js 18+ installed
- A Slack workspace where you can create apps
- A PeopleForce account with API access
- A server with HTTPS (for Slack to communicate with your bot)

## Setup Instructions

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Create a `.env` file in the root directory:

```env
# Slack Configuration
SLACK_BOT_TOKEN=xoxb-your-slack-bot-token
SLACK_USER_TOKEN=xoxp-your-slack-user-token  # Required for status updates
SLACK_SIGNING_SECRET=your-slack-signing-secret

# PeopleForce Configuration
PEOPLEFORCE_API_KEY=your-peopleforce-api-key
PEOPLEFORCE_API_URL=https://app.peopleforce.io/api/v1
# Note: You may need to check PeopleForce API docs for correct endpoint paths
# Common variations: /api/v1/leaves, /api/v1/time_offs, /api/v1/employees

# Server Configuration
PORT=3000

# Optional: Slack Channel ID for notifications (leave empty to disable)
NOTIFICATION_CHANNEL=
```

### 3. Create a Slack App (with Bot User)

**Important**: You need to create a **Slack App** (not just a workflow). This app will have a **Bot User** that runs in the background - it doesn't need to be visible in channels, it just needs the permissions to update statuses and respond to commands.

1. Go to [https://api.slack.com/apps](https://api.slack.com/apps)
2. Click **"Create New App"** → **"From scratch"**
3. Name your app (e.g., "Time Off Bot") and select your workspace
4. Click **"Create App"**

**Note**: By default, Slack apps created this way include a Bot User automatically. You don't need to add it separately - it's part of the app.

#### Configure OAuth & Permissions

1. Go to **"OAuth & Permissions"** in the sidebar
2. Scroll down to **"Scopes"** → **"Bot Token Scopes"**
3. Add the following scopes:
   - `commands` - For slash commands
   - `chat:write` - To send messages
   - `users:read` - To read user info
   - `users:read.email` - To get user emails
   - `users.profile:write` - To update user statuses
   - `files:read` - **REQUIRED for document uploads** in modals

4. Scroll down to **"User Token Scopes"** and add:
   - `users.profile:write` - To update user statuses (REQUIRED for status updates)

5. Scroll up and click **"Install to Workspace"**
6. Copy the **Bot User OAuth Token** (starts with `xoxb-`) and add it to your `.env` file as `SLACK_BOT_TOKEN`
7. Copy the **User OAuth Token** (starts with `xoxp-`) and add it to your `.env` file as `SLACK_USER_TOKEN`

**Important**: The User Token is required to update other users' statuses. Without it, status updates will fail.

#### Get Signing Secret

1. Go to **"Basic Information"** in the sidebar
2. Scroll down to **"App Credentials"**
3. Copy the **Signing Secret** and add it to your `.env` file as `SLACK_SIGNING_SECRET`

#### Configure Slash Commands

1. Go to **"Slash Commands"** in the sidebar
2. Click **"Create New Command"**
3. Configure:
   - **Command**: `/request-time-off`
   - **Request URL**: `https://your-domain.com/slack/events` (replace with your server URL)
   - **Short Description**: `Request time off from PeopleForce`
   - **Usage Hint**: (optional)
4. Click **"Save"**

5. Create another command:
   - **Command**: `/sync-statuses`
   - **Request URL**: `https://your-domain.com/slack/events` (same as above)
   - **Short Description**: `Manually sync time-off statuses`
   - Click **"Save"**

#### Configure Interactivity

1. Go to **"Interactivity & Shortcuts"** in the sidebar
2. Toggle **"Interactivity"** to **On**
3. Set **Request URL** to: `https://your-domain.com/slack/events` (same as above)
4. Click **"Save Changes"**

### 4. Get PeopleForce API Key

1. Log in to your PeopleForce account
2. Go to **Settings** → **Integrations** → **API**
3. Generate an API key
4. Copy the API key and add it to your `.env` file as `PEOPLEFORCE_API_KEY`
5. Note your PeopleForce API URL (usually `https://app.peopleforce.io/api/v1`) and add it to your `.env` file

### 5. Deploy Your Bot

You need to deploy this bot to a server with HTTPS. Here are some options:

- **Heroku**: Free tier available
- **Railway**: Easy deployment
- **Render**: Free tier available
- **AWS Lambda**: Serverless option
- **Your own server**: With HTTPS (use nginx as reverse proxy)

Make sure your server URL is accessible by Slack (public HTTPS endpoint).

### 6. Run the Bot

```bash
npm start
```

Or for development with auto-reload:

```bash
npm run dev
```

The bot will:
- Start listening for Slack events
- Run a daily sync job at 9 AM to update Slack statuses
- Immediately sync on startup

## Usage

### Request Time Off

1. In Slack, type `/request-time-off`
2. A modal will open with:
   - Leave type dropdown (fetched from PeopleForce)
   - Start date picker
   - End date picker
   - Optional comment field
3. Fill in the details and click **Submit**
4. Your request will be sent to PeopleForce and you'll receive a confirmation in Slack

### Automatic Status Updates

The bot automatically:
- Fetches approved time-offs from PeopleForce every day at 9 AM
- Updates Slack user statuses with appropriate emoji and text
- Sets status expiration to the day after leave ends
- Clears statuses automatically when they expire

### Manual Sync

Admins can manually trigger a sync by typing:

```
/sync-statuses
```

## How It Works

1. **Time Off Request Flow**:
   - User types `/request-time-off` in Slack
   - Bot opens modal with form
   - User submits form
   - Bot finds user's email → PeopleForce employee ID
   - Bot creates time-off request in PeopleForce
   - User receives confirmation

2. **Status Sync Flow**:
   - Scheduled job runs daily (default: 9 AM)
   - Bot fetches active time-offs from PeopleForce
   - For each active time-off:
     - Finds employee by email
     - Maps to Slack user by email
     - Updates Slack status with emoji and leave type
     - Sets expiration to day after leave ends

3. **Emoji Mapping**:
   - Vacation/Annual: 🌴
   - Sick Leave: 🤒
   - Personal/Unpaid: 🕓
   - Maternity/Paternity: 👶
   - Bereavement: 💔
   - Default: 🏖️

## Troubleshooting

### Status updates failing with "not_allowed_token_type"

**Problem**: Bot tokens cannot update other users' statuses.

**Solution**: 
1. Go to your Slack app → OAuth & Permissions
2. Add `users.profile:write` to **User Token Scopes** (not just Bot Token Scopes)
3. Reinstall the app to workspace
4. Copy the **User OAuth Token** (starts with `xoxp-`) 
5. Add it to `.env` as `SLACK_USER_TOKEN`

### PeopleForce API endpoints returning 404

**Problem**: The API endpoints `/api/v1/time_offs` or `/api/v1/employees` don't exist.

**Solution**:
1. Check PeopleForce API documentation: https://developer.peopleforce.io/docs/getting-started
2. Verify the correct endpoint paths (may be `/api/v1/leaves` instead of `/api/v1/time_offs`)
3. Update `PEOPLEFORCE_API_URL` in `.env` if needed
4. Contact PeopleForce support if endpoints are different

### Bot doesn't respond to commands

- Check that your Slack app is installed to the workspace
- Verify the Request URL in Slack app settings matches your server URL
- Make sure your server is accessible via HTTPS
- Check server logs for errors

### Statuses not updating

- Verify PeopleForce API key is correct
- Check that employees have emails in both Slack and PeopleForce
- Ensure time-offs are approved in PeopleForce
- Check server logs for API errors

### Time-off requests failing

- Verify employee email exists in PeopleForce
- Check that time-off type IDs match between Slack options and PeopleForce
- Ensure API key has proper permissions

## File Structure

```
slack-peopleforce-bot/
├── index.js              # Main bot file with Slack event handlers
├── peopleforce.js        # PeopleForce API integration
├── slackStatusSync.js    # Status sync logic
├── package.json          # Dependencies
├── .env                  # Environment variables (create this)
└── README.md             # This file
```

## Support

For issues or questions:
- Check the PeopleForce API documentation: https://developer.peopleforce.io/docs/getting-started
- Check Slack API documentation: https://api.slack.com/docs

## License

MIT

