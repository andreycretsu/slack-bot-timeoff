# 🔍 Checking What Fields API Returns

## The Issue

You're not seeing the document upload or on-demand toggle in the Slack modal. This could mean:
1. The fields are there but not visible (Slack UI issue)
2. The API doesn't return those fields
3. We need to check the actual API response

## How to Check What API Returns

After Render redeploys, when you:
1. Type `/request-time-off` in Slack
2. Select a leave type from the dropdown

**Check Render logs** - you should see:
```
📋 Leave type API response: {...full JSON...}
📋 Leave policy API response: {...full JSON...}
📋 Parsed leave type settings: {...}
```

This will show:
- What fields the API actually returns
- What field names PeopleForce uses for:
  - Document requirements (`requires_document`, `document_required`, etc.)
  - On-demand support (`on_demand`, `allows_on_demand`, etc.)
  - Comment requirements (`requires_reason`, `requires_comment`, etc.)

## What to Look For in Logs

Look for fields like:
- `requires_document` or `document_required` or `requires_attachment`
- `on_demand` or `allows_on_demand` or `supports_on_demand`
- `requires_reason` or `requires_comment` or `requires_description`

## If Fields Are Missing

If the API doesn't return these fields, we have two options:

1. **Always show the fields** (current approach) - Show document upload and on-demand toggle always, let user decide
2. **Check employee leave policy** - The policy assigned to the employee might have these settings instead of the leave type

## Next Steps

1. **Check Render logs** after selecting a leave type
2. **Share the API response** you see - I'll update the code to use the correct field names
3. **Or tell me** if you see the fields in the logs but they're empty/null

