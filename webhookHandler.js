import { syncTimeOffsToSlack } from './slackStatusSync.js';

/**
 * Handle PeopleForce webhook events
 * PeopleForce can send webhooks when leave requests are created, approved, rejected, or withdrawn
 * 
 * Setup in PeopleForce:
 * 1. Go to Settings → Webhooks
 * 2. Add new webhook
 * 3. Payload URL: https://your-ngrok-url.ngrok-free.dev/webhook/peopleforce
 * 4. Select topics: leave_request.created, leave_request.approved, leave_request.rejected, leave_request.withdrawn
 */
/**
 * Setup webhook routes after app starts
 * This is called after app.start() to ensure the Express server is ready
 * Bolt v3 uses Express under the hood
 */
export function setupWebhookRoutes(app, client, userEmailMap, userClient) {
  try {
    // Bolt v3 uses HTTPReceiver which has an Express app
    const receiver = app.receiver;
    
    // HTTPReceiver uses Express internally - try to access it
    let expressApp = null;
    
    // HTTPReceiver has an 'app' property that contains the Express app
    if (receiver && receiver.app) {
      expressApp = receiver.app;
    }
    
    if (expressApp && typeof expressApp.post === 'function') {
      // Webhook endpoint for PeopleForce
      expressApp.post('/webhook/peopleforce', async (req, res) => {
        try {
          // Parse JSON body manually
          let body = '';
          req.on('data', chunk => { body += chunk.toString(); });
          req.on('end', async () => {
            try {
              const event = JSON.parse(body);
              console.log('🔔 Received PeopleForce webhook:', JSON.stringify(event, null, 2));
              
              // Acknowledge receipt immediately (PeopleForce expects quick response)
              res.status(200).send('OK');
              
              // Process the webhook event asynchronously
              processWebhookEvent(event, client, userEmailMap, userClient).catch(console.error);
              
            } catch (parseError) {
              console.error('Error parsing webhook body:', parseError);
              if (!res.headersSent) {
                res.status(400).send('Invalid JSON');
              }
            }
          });
        } catch (error) {
          console.error('Error handling webhook:', error);
          if (!res.headersSent) {
            res.status(500).send('Error processing webhook');
          }
        }
      });
      
      console.log('✅ Webhook endpoint configured: /webhook/peopleforce');
      return true;
    } else {
      console.warn('⚠️  Could not set up webhook endpoint - Express app not accessible');
      console.warn('   Receiver type:', receiver?.constructor?.name || 'unknown');
      console.warn('   Available properties:', Object.keys(receiver || {}).join(', '));
      console.warn('   You can still use scheduled sync every 15 minutes');
      console.warn('   Webhooks will work once you deploy to a server with proper routing');
      return false;
    }
  } catch (error) {
    console.error('Error setting up webhook routes:', error);
    return false;
  }
}

/**
 * Process webhook event from PeopleForce
 * Export this so it can be called from custom route
 */
export async function processWebhookEvent(event, client, userEmailMap, userClient) {
  try {
    // PeopleForce webhook events use "action" field
    // Format: { "action": "leave_request_destroy", "data": {...} }
    // Actions: leave_request_created, leave_request_approved, leave_request_rejected, 
    //          leave_request_withdrawn, leave_request_destroy
    
    const eventType = event.action || event.event || event.type || event.topic;
    const leaveRequest = event.data || event.leave_request || event;
    
    console.log(`📨 Processing webhook event: ${eventType}`);
    
    // If it's a leave request event (any action), trigger a sync
    if (eventType?.includes('leave_request') || eventType?.includes('leave') || eventType?.includes('time_off')) {
      console.log('🔄 Triggering sync due to webhook event...');
      console.log(`   Event type: ${eventType}`);
      console.log(`   Leave request data:`, {
        id: leaveRequest?.id || leaveRequest?.data?.id,
        employeeId: leaveRequest?.data?.attributes?.employee_id || leaveRequest?.employee_id,
        state: leaveRequest?.data?.attributes?.state || leaveRequest?.state,
        employee: leaveRequest?.data?.employee || leaveRequest?.employee
      });
      
      const result = await syncTimeOffsToSlack(client, userEmailMap, userClient);
      console.log(`✅ Webhook sync complete: ${result.updated} updated, ${result.cleared} cleared, ${result.errors} errors`);
    } else {
      console.log(`⚠️  Unknown webhook event type: ${eventType}, skipping...`);
      console.log(`   Full event:`, JSON.stringify(event, null, 2));
    }
    
  } catch (error) {
    console.error('Error processing webhook event:', error);
  }
}

