import pkg from '@slack/bolt';
const { App } = pkg;
import { WebClient } from '@slack/web-api';
import dotenv from 'dotenv';
import { 
  findEmployeeByEmail, 
  getTimeOffTypes, 
  createTimeOffRequest 
} from './peopleforce.js';
import { startScheduledSync, syncTimeOffsToSlack } from './slackStatusSync.js';
import { setupWebhookRoutes } from './webhookHandler.js';

dotenv.config();

// Support both bot token and user token
// Bot token for commands, user token for status updates
const botToken = process.env.SLACK_BOT_TOKEN;
const userToken = process.env.SLACK_USER_TOKEN || process.env.SLACK_BOT_TOKEN; // Fallback to bot token

const app = new App({
  token: botToken,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
  socketMode: false,
  processBeforeResponse: true,
  customRoutes: [
    {
      path: '/webhook/peopleforce',
      method: ['POST'],
      handler: async (req, res) => {
        // Parse JSON body
        let body = '';
        req.on('data', chunk => { body += chunk.toString(); });
        req.on('end', async () => {
          let responseSent = false;
          try {
            const event = JSON.parse(body);
            console.log('🔔 Received PeopleForce webhook:', JSON.stringify(event, null, 2));
            
            // Acknowledge immediately (Node.js HTTP response)
            if (!responseSent) {
              res.writeHead(200, { 'Content-Type': 'text/plain' });
              res.end('OK');
              responseSent = true;
            }
            
            // Process asynchronously using the imported function
            const { processWebhookEvent } = await import('./webhookHandler.js');
            processWebhookEvent(event, app.client, userEmailMap, userClient).catch(console.error);
          } catch (error) {
            console.error('Error handling webhook:', error);
            if (!responseSent && !res.headersSent) {
              try {
                res.writeHead(500, { 'Content-Type': 'text/plain' });
                res.end('Error processing webhook');
                responseSent = true;
              } catch (responseError) {
                console.error('Error sending error response:', responseError);
              }
            }
          }
        });
      },
    },
  ],
});

// Create a separate client for user token operations (status updates)
const userClient = new WebClient(userToken);

// Store for user email to Slack ID mapping
const userEmailMap = {};

/**
 * Initialize and start the bot
 */
async function initialize() {
  try {
    // Start the scheduled sync job - runs every 15 minutes automatically
    // Cron format: '*/15 * * * *' = every 15 minutes
    // Also runs immediately on startup
    startScheduledSync(app.client, userEmailMap, '*/15 * * * *', userClient);
    
    // Start the Slack app
    const port = process.env.PORT || 3000;
    await app.start(port);
    
    // Setup webhook handler for real-time updates from PeopleForce (after app starts)
    setupWebhookRoutes(app, app.client, userEmailMap, userClient);
    
    console.log(`⚡️ Slack-PeopleForce Bot is running on port ${port}!`);
    console.log(`📅 Scheduled sync job started (every 15 minutes)`);
    console.log(`🔔 Webhook endpoint: http://localhost:${port}/webhook/peopleforce`);
    console.log(`   Configure this URL in PeopleForce: Settings → Webhooks`);
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

/**
 * Slash command /request-time-off - Opens modal to request time off
 */
app.command('/request-time-off', async ({ ack, body, client }) => {
  await ack();
  
  try {
    // Fetch time-off types from PeopleForce
    const timeOffTypes = await getTimeOffTypes();
    
    // Build options for the dropdown
    const typeOptions = timeOffTypes.map(type => ({
      text: {
        type: 'plain_text',
        text: `${type.name || type.title || 'Unknown'} ${getEmojiForType(type.name || type.title || '')}`,
      },
      value: String(type.id),
    }));
    
    // If no types found, use default options
    if (typeOptions.length === 0) {
      typeOptions.push(
        { text: { type: 'plain_text', text: 'Vacation 🌴' }, value: '1' },
        { text: { type: 'plain_text', text: 'Sick Leave 🤒' }, value: '2' },
        { text: { type: 'plain_text', text: 'Personal 🕓' }, value: '3' }
      );
    }
    
    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: 'modal',
        callback_id: 'timeoff_request',
        title: { type: 'plain_text', text: 'Request Time Off' },
        submit: { type: 'plain_text', text: 'Submit' },
        close: { type: 'plain_text', text: 'Cancel' },
        blocks: [
          {
            type: 'input',
            block_id: 'type_block',
            label: { type: 'plain_text', text: 'Leave Type' },
            element: {
              type: 'static_select',
              action_id: 'leave_type',
              placeholder: { type: 'plain_text', text: 'Select leave type' },
              options: typeOptions,
            },
          },
          {
            type: 'input',
            block_id: 'start_block',
            label: { type: 'plain_text', text: 'Start Date' },
            element: {
              type: 'datepicker',
              action_id: 'start_date',
              initial_date: new Date().toISOString().split('T')[0],
            },
          },
          {
            type: 'input',
            block_id: 'end_block',
            label: { type: 'plain_text', text: 'End Date' },
            element: {
              type: 'datepicker',
              action_id: 'end_date',
              initial_date: new Date().toISOString().split('T')[0],
            },
          },
          {
            type: 'input',
            block_id: 'comment_block',
            label: { type: 'plain_text', text: 'Comment (optional)' },
            optional: true,
            element: {
              type: 'plain_text_input',
              action_id: 'comment',
              multiline: true,
              placeholder: { type: 'plain_text', text: 'Add any additional details...' },
            },
          },
        ],
      },
    });
  } catch (error) {
    console.error('Error opening time-off modal:', error);
    await client.chat.postMessage({
      channel: body.user_id,
      text: `❌ Sorry, I couldn't open the time-off request form. Please try again later.`,
    });
  }
});

/**
 * Handle modal submission
 */
app.view('timeoff_request', async ({ ack, view, body, client }) => {
  await ack();
  
  const slackUserId = body.user.id;
  const leaveTypeId = view.state.values.type_block.leave_type.selected_option.value;
  const startDate = view.state.values.start_block.start_date.selected_date;
  const endDate = view.state.values.end_block.end_date.selected_date;
  const comment = view.state.values.comment_block?.comment?.value || '';
  
  try {
    // Get Slack user info to get email
    const userInfo = await client.users.info({ user: slackUserId });
    const email = userInfo.user.profile?.email;
    
    if (!email) {
      throw new Error('Could not find your email address. Please make sure your Slack profile has an email.');
    }
    
    // Find employee in PeopleForce
    const employee = await findEmployeeByEmail(email);
    
    if (!employee) {
      throw new Error(`Employee not found in PeopleForce for email: ${email}`);
    }
    
    // Store mapping for future use
    userEmailMap[email.toLowerCase()] = slackUserId;
    
    // Create time-off request
    const timeOff = await createTimeOffRequest(
      employee.id,
      parseInt(leaveTypeId),
      startDate,
      endDate,
      comment
    );
    
    // Format response message
    const startDateFormatted = new Date(startDate).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
    const endDateFormatted = new Date(endDate).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric',
      year: 'numeric'
    });
    
    await client.chat.postMessage({
      channel: slackUserId,
      text: `✅ *Time-off request submitted!*\n\n` +
            `📅 Dates: ${startDateFormatted} → ${endDateFormatted}\n` +
            `📋 Status: ${timeOff.status || 'Pending approval'}\n` +
            `\nYour request has been sent to PeopleForce and will be reviewed by your manager.`,
    });
    
    console.log(`✅ Time-off request created for ${email} (${startDate} → ${endDate})`);
  } catch (error) {
    console.error('Error creating time-off request:', error);
    
    await client.chat.postMessage({
      channel: slackUserId,
      text: `❌ *Failed to create time-off request*\n\n${error.message}\n\nPlease try again or contact your administrator.`,
    });
  }
});

/**
 * Helper function to get emoji for leave type
 */
function getEmojiForType(typeName) {
  const name = (typeName || '').toLowerCase();
  if (name.includes('vacation') || name.includes('annual')) return '🌴';
  if (name.includes('sick')) return '🤒';
  if (name.includes('personal') || name.includes('unpaid')) return '🕓';
  if (name.includes('maternity') || name.includes('paternity')) return '👶';
  if (name.includes('bereavement')) return '💔';
  return '🏖️';
}

/**
 * Manual sync command (for admins/testing)
 */
app.command('/sync-statuses', async ({ ack, body, client }) => {
  await ack();
  
  try {
    await client.chat.postMessage({
      channel: body.user_id,
      text: '🔄 Starting manual sync...',
    });
    
    const result = await syncTimeOffsToSlack(client, userEmailMap, userClient);
    
    await client.chat.postMessage({
      channel: body.user_id,
      text: `✅ Sync complete!\n\n• Updated: ${result.updated || 0}\n• Cleared: ${result.cleared || 0}\n• Errors: ${result.errors || 0}`,
    });
  } catch (error) {
    console.error('Error in manual sync:', error);
    await client.chat.postMessage({
      channel: body.user_id,
      text: `❌ Sync failed: ${error.message}`,
    });
  }
});

// Error handling
app.error((error) => {
  console.error('Slack app error:', error);
});

// Start the bot
initialize();

