# Quick Deployment Guide

## Option 1: Render (Easiest - Free)

1. Go to https://render.com
2. Sign up with GitHub (or create account)
3. Click "New" → "Web Service"
4. Connect your GitHub repo (or use their GitHub integration)
5. Configure:
   - **Name**: `slack-peopleforce-bot`
   - **Environment**: `Node`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
   - **Environment Variables**: Add all from your `.env` file
6. Click "Create Web Service"
7. Wait for deployment (2-3 minutes)
8. Copy your URL (e.g., `https://slack-peopleforce-bot.onrender.com`)
9. Use in Slack: `https://slack-peopleforce-bot.onrender.com/slack/events`

## Option 2: Railway (Also Easy - Free)

1. Go to https://railway.app
2. Sign up with GitHub
3. Click "New Project" → "Deploy from GitHub repo"
4. Select your repo
5. Add environment variables from `.env`
6. Railway auto-detects Node.js
7. Get your URL: `https://your-app.railway.app`
8. Use in Slack: `https://your-app.railway.app/slack/events`

## Option 3: Heroku (Traditional - Free)

1. Install Heroku CLI: https://devcenter.heroku.com/articles/heroku-cli
2. Run:
```bash
heroku login
heroku create slack-peopleforce-bot
git init
git add .
git commit -m "Initial commit"
git push heroku main
heroku config:set SLACK_BOT_TOKEN=your-token
heroku config:set SLACK_SIGNING_SECRET=your-secret
heroku config:set PEOPLEFORCE_API_KEY=your-key
heroku config:set PEOPLEFORCE_API_URL=your-url
```
3. Your URL: `https://slack-peopleforce-bot.herokuapp.com`
4. Use in Slack: `https://slack-peopleforce-bot.herokuapp.com/slack/events`

## After Deployment

Once you have your URL (e.g., `https://your-app.onrender.com`):

1. **Slack App → Slash Commands → `/request-time-off`**
   - Request URL: `https://your-app.onrender.com/slack/events`

2. **Slack App → Interactivity & Shortcuts**
   - Request URL: `https://your-app.onrender.com/slack/events`

3. **Test**: Type `/request-time-off` in Slack!

