# Testing Status

## Issues Found

### 1. Slack Status Updates
The `users.profile:write` scope only allows updating the bot's own status, not other users' statuses. 

**Solution needed**: Users need to grant OAuth permissions to the app to update their status. This requires:
- Adding User Token Scopes to the Slack app
- Users installing/authorizing the app with those scopes
- Or using a different approach

### 2. PeopleForce API Endpoints
The following endpoints return 404:
- `/api/v1/time_offs` 
- `/api/v1/employees`

**Solution needed**: Check PeopleForce API documentation for correct endpoint paths.

## What Works
✅ Bot connects to Slack
✅ Bot can read user information
✅ Bot is running and accessible via ngrok

## Next Steps
1. Check PeopleForce API documentation for correct endpoint URLs
2. Set up user OAuth scopes in Slack app for status updates
3. Test with correct API endpoints

