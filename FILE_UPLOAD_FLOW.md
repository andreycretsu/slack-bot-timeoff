# 📎 File Upload Flow Explanation

## Why `files:read` Scope is Needed

When a user uploads a file through the Slack modal, here's what happens:

### The Flow:

```
1. User uploads file in Slack modal
   ↓
2. Slack stores the file (not PeopleForce yet!)
   ↓
3. User submits the form
   ↓
4. Slack sends us a FILE ID (not the file itself)
   ↓
5. We need files:read scope to:
   - Get file info from Slack (file.info)
   - Get file URL/download it
   ↓
6. Then we upload it to PeopleForce
```

### Why We Need `files:read`:

When you use `file_input` in a Slack modal:
- Slack stores the file on their servers
- When the form is submitted, Slack gives us a **file ID** (like `F1234567890`)
- To get the actual file or its URL, we need to call:
  ```javascript
  client.files.info({ file: fileId }) // Requires files:read scope
  ```

Without `files:read` scope:
- ❌ We can't access the file info
- ❌ We can't get the file URL
- ❌ We can't download the file to send to PeopleForce

### The Code Flow:

```javascript
// 1. User uploads file in modal → Slack stores it
// 2. Form submission contains file ID:
const documentUpload = view.state.values.document_block?.document_upload?.files || [];
const fileId = documentUpload[0].id; // e.g., "F1234567890"

// 3. We need files:read to get file info:
const fileInfo = await client.files.info({ file: fileId }); // Requires files:read!
const fileUrl = fileInfo.file.url_private;

// 4. Then we can upload to PeopleForce
```

## Alternative: Direct File Upload?

If PeopleForce API accepts a Slack file URL directly (without downloading), we still need `files:read` to get that URL.

## Summary

**Yes, you need `files:read` scope** because:
- Slack stores the file first (not PeopleForce)
- We get a file ID, not the file itself
- We need to read the file from Slack to send it to PeopleForce

Without `files:read`, the file upload field won't work properly.

