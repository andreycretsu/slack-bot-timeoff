# 🚀 Deploy to Render - Step by Step Guide

## Step 1: Push Code to GitHub

1. **Create a new repository on GitHub:**
   - Go to https://github.com/new
   - Repository name: `slack-peopleforce-bot` (or any name you like)
   - Make it **Private** (recommended for security)
   - **Don't** initialize with README, .gitignore, or license (we already have these)
   - Click "Create repository"

2. **Push your code to GitHub:**
   ```bash
   git remote add origin https://github.com/YOUR_USERNAME/slack-peopleforce-bot.git
   git branch -M main
   git push -u origin main
   ```
   Replace `YOUR_USERNAME` with your GitHub username.

## Step 2: Create Project on Render

1. **Go to Render Dashboard:**
   - Visit https://dashboard.render.com
   - Click **"+ New"** → **"Web Service"**

2. **Connect GitHub:**
   - Click **"Connect GitHub"** (or "Connect GitLab" if using GitLab)
   - Authorize Render to access your repositories
   - Select your repository: `slack-peopleforce-bot`

3. **Configure the Service:**
   - **Name**: `slack-peopleforce-bot`
   - **Environment**: `Node`
   - **Region**: Choose closest to you (e.g., `Oregon (US West)`)
   - **Branch**: `main`
   - **Root Directory**: (leave empty)
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`

4. **Add Environment Variables:**
   Click **"Advanced"** → **"Add Environment Variable"** and add:
   - `SLACK_BOT_TOKEN` = `your-slack-bot-token-here` (starts with `xoxb-`)
   - `SLACK_USER_TOKEN` = `your-slack-user-token-here` (starts with `xoxp-`)
   - `SLACK_SIGNING_SECRET` = `your-slack-signing-secret-here`
   - `PEOPLEFORCE_API_KEY` = `your-peopleforce-api-key-here`
   - `PEOPLEFORCE_API_URL` = `https://demo.stage-81y92gtmor-peopleforce.dev/api/public/v3` (or your PeopleForce URL)
   - `PORT` = `10000` (Render sets this automatically, but good to have as fallback)

5. **Create Web Service:**
   - Click **"Create Web Service"**
   - Render will start building and deploying your bot

## Step 3: Wait for Deployment

- Render will:
  1. Clone your code from GitHub
  2. Run `npm install`
  3. Start your bot with `npm start`
  4. Give you a URL like: `https://slack-peopleforce-bot.onrender.com`

## Step 4: Update Webhook URLs

Once your bot is deployed, you'll get a URL like:
```
https://slack-peopleforce-bot.onrender.com
```

### Update Slack App:
1. Go to https://api.slack.com/apps
2. Select your app
3. Go to **"Slash Commands"** → `/request-time-off`
   - Update Request URL to: `https://slack-peopleforce-bot.onrender.com/slack/events`
4. Go to **"Slash Commands"** → `/sync-statuses`
   - Update Request URL to: `https://slack-peopleforce-bot.onrender.com/slack/events`
5. Go to **"Interactivity & Shortcuts"**
   - Update Request URL to: `https://slack-peopleforce-bot.onrender.com/slack/events`

### Update PeopleForce Webhook:
1. Go to PeopleForce → Settings → Webhooks
2. Edit your webhook
3. Update Payload URL to: `https://slack-peopleforce-bot.onrender.com/webhook/peopleforce`

## Step 5: Test It!

1. Type `/request-time-off` in Slack - should work!
2. Create a leave request in PeopleForce - status should update automatically!
3. Check bot logs in Render dashboard if something doesn't work

## ✅ Done!

Your bot is now:
- ✅ Running 24/7 on Render
- ✅ Receiving webhooks from PeopleForce
- ✅ Syncing statuses automatically every 15 minutes
- ✅ No need for ngrok anymore!

## Troubleshooting

**Bot not responding?**
- Check Render logs: Dashboard → Your Service → Logs
- Verify environment variables are set correctly

**Webhooks not working?**
- Make sure the webhook URL in PeopleForce uses your Render URL (not ngrok)
- Check Render logs for webhook delivery attempts

**Status updates not working?**
- Check that `SLACK_USER_TOKEN` has `users.profile:write` scope
- Verify PeopleForce API key is correct

