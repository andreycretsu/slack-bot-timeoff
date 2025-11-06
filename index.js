import pkg from '@slack/bolt';
const { App } = pkg;
import { WebClient } from '@slack/web-api';
import dotenv from 'dotenv';
import { 
  findEmployeeByEmail, 
  getTimeOffTypes, 
  getLeaveTypeById,
  getLeavePolicies,
  getLeavePolicyByTypeId,
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
      path: '/health',
      method: ['GET'],
      handler: async (req, res) => {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ 
          status: 'ok', 
          timestamp: new Date().toISOString(),
          bot: 'slack-peopleforce-bot'
        }));
      },
    },
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
    console.log(`🏥 Health check: http://localhost:${port}/health`);
    console.log(`📝 Slack events endpoint: http://localhost:${port}/slack/events`);
  } catch (error) {
    console.error('❌ Failed to start bot:', error);
    process.exit(1);
  }
}

/**
 * Slash command /request-time-off - Opens modal to request time off
 */
app.command('/request-time-off', async ({ ack, body, client, respond }) => {
  console.log(`📝 Received /request-time-off from user ${body.user_id}`);
  
  // CRITICAL: Acknowledge immediately to prevent dispatch_failed
  try {
    await ack();
    console.log(`✅ Command acknowledged for user ${body.user_id}`);
  } catch (ackError) {
    console.error('❌ CRITICAL: Error acknowledging command:', ackError);
    console.error('Ack error details:', {
      message: ackError.message,
      code: ackError.code,
      data: ackError.data
    });
    // Try to respond with error message
    try {
      await respond({
        response_type: 'ephemeral',
        text: `❌ Error: Could not process command. Please try again or contact support.`
      });
    } catch (respondError) {
      console.error('Error responding:', respondError);
    }
    return;
  }
  
  // Now handle the command (after ack)
  try {
    // Fetch time-off types from PeopleForce (with timeout protection)
    let timeOffTypes = [];
    let typeOptions = [];
    let leaveTypesMap = {}; // Map of leave type ID to details
    
    try {
      // Fetch with 3 second timeout
      timeOffTypes = await Promise.race([
        getTimeOffTypes(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Timeout fetching time-off types')), 3000)
        )
      ]);
      
      if (timeOffTypes && timeOffTypes.length > 0) {
        console.log(`✅ Fetched ${timeOffTypes.length} time-off types from PeopleForce`);
        
        // Build options from PeopleForce leave types
        typeOptions = timeOffTypes.map(type => {
          // Store leave type details for later use
          leaveTypesMap[String(type.id)] = type;
          
          return {
            text: {
              type: 'plain_text',
              text: `${type.name || type.title || 'Unknown'} ${getEmojiForType(type.name || type.title || '')}`,
            },
            value: String(type.id),
            description: type.description ? {
              type: 'plain_text',
              text: type.description.substring(0, 75) // Limit description length
            } : undefined,
          };
        });
      }
    } catch (fetchError) {
      console.error('Error fetching time-off types:', fetchError.message);
      // Continue with default options if fetch fails
    }
    
    // If no types found or fetch failed, use default options
    if (typeOptions.length === 0) {
      typeOptions = [
        { text: { type: 'plain_text', text: 'Vacation 🌴' }, value: '1' },
        { text: { type: 'plain_text', text: 'Sick Leave 🤒' }, value: '2' },
        { text: { type: 'plain_text', text: 'Personal 🕓' }, value: '3' },
        { text: { type: 'plain_text', text: 'Time Off 🏖️' }, value: '4' }
      ];
      console.log('⚠️  Using default leave types (PeopleForce API unavailable)');
    }
    
    // Build modal blocks - base fields (always shown)
    const blocks = [
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
    ];
    
    // Add comment/reason field (optional - API will validate if required)
    blocks.push({
      type: 'input',
      block_id: 'comment_block',
      label: { type: 'plain_text', text: 'Reason/Comment' },
      optional: true,
      element: {
        type: 'plain_text_input',
        action_id: 'comment',
        multiline: true,
        placeholder: { type: 'plain_text', text: 'Add any additional details or reason for leave...' },
      },
    });
    
    // Open modal - this must happen after ack()
    if (!body.trigger_id) {
      throw new Error('Missing trigger_id in request body');
    }
    
    await client.views.open({
      trigger_id: body.trigger_id,
      view: {
        type: 'modal',
        callback_id: 'timeoff_request',
        title: { type: 'plain_text', text: 'Request Time Off' },
        submit: { type: 'plain_text', text: 'Submit' },
        close: { type: 'plain_text', text: 'Cancel' },
        blocks: blocks,
      },
    });
    
    console.log(`✅ Opened time-off modal for user ${body.user_id}`);
  } catch (error) {
    console.error('❌ Error opening time-off modal:', error);
    console.error('Error details:', {
      message: error.message,
      code: error.code,
      data: error.data,
      stack: error.stack
    });
    
    // Try to send error message to user
    try {
      await client.chat.postMessage({
        channel: body.user_id,
        text: `❌ Sorry, I couldn't open the time-off request form.\n\nError: ${error.message}\n\nPlease try again or contact your administrator.`,
      });
    } catch (msgError) {
      console.error('Error sending error message:', msgError);
      // Last resort: try respond()
      try {
        await respond({
          response_type: 'ephemeral',
          text: `❌ Error: ${error.message}`
        });
      } catch (respondError) {
        console.error('Error responding:', respondError);
      }
    }
  }
});

/**
 * Handle leave type selection change
 * NOTE: PeopleForce API doesn't return field requirements, so we just log the selection
 */
app.action('leave_type', async ({ ack, body, client }) => {
  await ack();
  const selectedTypeId = body.actions[0].selected_option.value;
  console.log(`📝 Leave type selected: ${selectedTypeId}`);
});

/**
 * Handle start date change - validate date range
 */
app.action('start_date', async ({ ack, body, client }) => {
  await ack();
  
  try {
    const startDate = body.actions[0].selected_date;
    const viewId = body.view.id;
    const currentView = body.view;
    
    // Get end date from current view
    const endDate = currentView.state?.values?.end_block?.end_date?.selected_date;
    
    if (endDate && endDate < startDate) {
      // Update modal to show error hint on end date
      const updatedBlocks = currentView.blocks.map(block => {
        if (block.block_id === 'end_block') {
          return {
            ...block,
            hint: {
              type: 'plain_text',
              text: '⚠️ End date must be on or after start date'
            }
          };
        }
        return block;
      });
      
      await client.views.update({
        view_id: viewId,
        view: {
          ...currentView,
          blocks: updatedBlocks
        }
      });
    } else {
      // Clear error hint if dates are valid
      const updatedBlocks = currentView.blocks.map(block => {
        if (block.block_id === 'end_block' && block.hint?.text?.includes('⚠️')) {
          return {
            ...block,
            hint: undefined
          };
        }
        return block;
      });
      
      await client.views.update({
        view_id: viewId,
        view: {
          ...currentView,
          blocks: updatedBlocks
        }
      });
    }
  } catch (error) {
    console.error('Error handling start date change:', error);
  }
});

/**
 * Handle end date change - validate date range
 */
app.action('end_date', async ({ ack, body, client }) => {
  await ack();
  
  try {
    const endDate = body.actions[0].selected_date;
    const viewId = body.view.id;
    const currentView = body.view;
    
    // Get start date from current view
    const startDate = currentView.state?.values?.start_block?.start_date?.selected_date;
    
    if (startDate && endDate < startDate) {
      // Update modal to show error hint on end date
      const updatedBlocks = currentView.blocks.map(block => {
        if (block.block_id === 'end_block') {
          return {
            ...block,
            hint: {
              type: 'plain_text',
              text: '⚠️ End date must be on or after start date'
            }
          };
        }
        return block;
      });
      
      await client.views.update({
        view_id: viewId,
        view: {
          ...currentView,
          blocks: updatedBlocks
        }
      });
    } else {
      // Clear error hint if dates are valid
      const updatedBlocks = currentView.blocks.map(block => {
        if (block.block_id === 'end_block' && block.hint?.text?.includes('⚠️')) {
          return {
            ...block,
            hint: undefined
          };
        }
        return block;
      });
      
      await client.views.update({
        view_id: viewId,
        view: {
          ...currentView,
          blocks: updatedBlocks
        }
      });
    }
  } catch (error) {
    console.error('Error handling end date change:', error);
  }
});

/**
 * Handle modal submission
 */
app.view('timeoff_request', async ({ ack, view, body, client }) => {
  try {
    await ack();
  
    const slackUserId = body.user.id;
    const leaveTypeId = view.state.values.type_block.leave_type.selected_option.value;
    const startDate = view.state.values.start_block.start_date.selected_date;
    const endDate = view.state.values.end_block.end_date.selected_date;
    const comment = view.state.values.comment_block?.comment?.value || '';
  
    // Validate dates BEFORE processing
    if (endDate < startDate) {
      throw new Error('❌ End date cannot be before start date. Please select a valid date range.');
    }
    
    console.log(`📝 Processing time-off request:`, {
      userId: slackUserId,
      leaveTypeId,
      startDate,
      endDate,
      hasComment: !!comment
    });
  
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
    // Note: API uses 'description' field, not 'reason'
    // PeopleForce API will validate required fields and return errors if needed
    const timeOff = await createTimeOffRequest(
      employee.id,
      parseInt(leaveTypeId),
      startDate,
      endDate,
      comment || '', // Use comment as description
      null, // leave_request_entries (for partial days) - not implemented yet
      false, // skip_approval - keep false to require approval
      null, // document URL - not supported by API currently
      false // on-demand flag - not supported by API currently
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
    
    try {
      await client.chat.postMessage({
        channel: slackUserId,
        text: `❌ *Failed to create time-off request*\n\n${error.message}\n\nPlease try again or contact your administrator.`,
      });
    } catch (msgError) {
      console.error('Error sending error message:', msgError);
    }
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
  // Acknowledge immediately
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
    try {
      await client.chat.postMessage({
        channel: body.user_id,
        text: `❌ Sync failed: ${error.message}`,
      });
    } catch (msgError) {
      console.error('Error sending error message:', msgError);
    }
  }
});

// Error handling
app.error((error) => {
  console.error('Slack app error:', error);
});

// Start the bot
initialize();

