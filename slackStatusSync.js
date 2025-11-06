import { getActiveTimeOffs, findEmployeeByEmail, getTimeOffs } from './peopleforce.js';
import nodeCron from 'node-cron';

/**
 * Map leave type to emoji
 */
function getEmojiForLeaveType(leaveTypeName) {
  const name = (leaveTypeName || '').toLowerCase();
  
  if (name.includes('vacation') || name.includes('annual') || name.includes('holiday')) {
    return ':palm_tree:';
  }
  if (name.includes('sick')) {
    return ':face_with_thermometer:';
  }
  if (name.includes('personal') || name.includes('unpaid')) {
    return ':calendar:';
  }
  if (name.includes('maternity') || name.includes('paternity')) {
    return ':baby:';
  }
  if (name.includes('bereavement')) {
    return ':broken_heart:';
  }
  
  // Default emoji
  return ':beach_with_umbrella:';
}

/**
 * Format date range text for status
 */
function formatDateRange(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  const startStr = start.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  const endStr = end.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  
  if (startDate === endDate) {
    return startStr;
  }
  
  return `${startStr} - ${endStr}`;
}

/**
 * Calculate expiration timestamp (midnight of day after end date)
 */
function getExpirationTimestamp(endDate) {
  const end = new Date(endDate);
  end.setDate(end.getDate() + 1);
  end.setHours(0, 0, 0, 0);
  return Math.floor(end.getTime() / 1000);
}

/**
 * Update Slack user status based on time-off
 * Uses user token if provided, otherwise falls back to bot token
 */
export async function updateSlackStatus(client, slackUserId, timeOff, userClient = null) {
  try {
    const emoji = getEmojiForLeaveType(timeOff.leave_type?.name || timeOff.time_off_type?.name || timeOff.type_name);
    const startDate = timeOff.starts_on || timeOff.start_date;
    const endDate = timeOff.ends_on || timeOff.end_date;
    const leaveTypeName = timeOff.leave_type?.name || timeOff.time_off_type?.name || timeOff.type_name || 'Time off';
    
    // Calculate the day after leave ends (for status display)
    const endDateObj = new Date(endDate);
    endDateObj.setDate(endDateObj.getDate() + 1); // Add one day
    const dayAfterEndDate = endDateObj.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    
    // Format: "Leave Type till End Date + 1 day"
    // Example: "Vacation till Nov 11" (if leave ends Nov 10)
    const statusText = `${leaveTypeName} till ${dayAfterEndDate}`;
    const expiration = getExpirationTimestamp(endDate);
    
    // Use userClient if provided (has user token), otherwise use regular client
    const clientToUse = userClient || client;
    
    await clientToUse.users.profile.set({
      user: slackUserId,
      profile: {
        status_text: statusText,
        status_emoji: emoji,
        status_expiration: expiration,
      },
    });
    
    console.log(`✅ Updated status for user ${slackUserId}: ${emoji} ${statusText}`);
    return true;
  } catch (error) {
    console.error(`❌ Error updating status for user ${slackUserId}:`, error.message);
    if (error.data?.error === 'not_allowed_token_type') {
      console.error('   ⚠️  Need user token with users.profile:write scope. See README for setup.');
    }
    return false;
  }
}

/**
 * Clear Slack user status
 * @param {Object} client - Bot client (will use userClient if provided)
 * @param {Object} slackUserId - Slack user ID
 * @param {Object} userClient - User token client for status updates (optional)
 */
export async function clearSlackStatus(client, slackUserId, userClient = null) {
  try {
    // Use userClient if provided (has user token), otherwise use regular client
    const clientToUse = userClient || client;
    
    await clientToUse.users.profile.set({
      user: slackUserId,
      profile: {
        status_text: '',
        status_emoji: '',
        status_expiration: 0,
      },
    });
    
    console.log(`✅ Cleared status for user ${slackUserId}`);
    return true;
  } catch (error) {
    console.error(`❌ Error clearing status for user ${slackUserId}:`, error.message);
    if (error.data?.error === 'not_allowed_token_type') {
      console.error('   ⚠️  Need user token with users.profile:write scope. See README for setup.');
    }
    return false;
  }
}

/**
 * Sync all active time-offs to Slack statuses
 * @param {Object} client - Bot client for reading data
 * @param {Object} userEmailMap - Email to Slack ID mapping
 * @param {Object} userClient - User token client for status updates (optional)
 */
export async function syncTimeOffsToSlack(client, userEmailMap = {}, userClient = null) {
  try {
    console.log('🔄 Syncing time-offs to Slack statuses...');
    
    // Get all active time-offs (approved, ongoing)
    const activeTimeOffs = await getActiveTimeOffs();
    console.log(`Found ${activeTimeOffs.length} active time-off(s)`);
    
    const slackUsers = await client.users.list();
    const emailToSlackId = {};
    const slackUserIdToEmail = {};
    
    // Build email to Slack user ID mapping (both directions)
    for (const user of slackUsers.members || []) {
      if (user.profile?.email) {
        const email = user.profile.email.toLowerCase();
        emailToSlackId[email] = user.id;
        slackUserIdToEmail[user.id] = email;
      }
    }
    
    // Merge with provided mapping
    Object.assign(emailToSlackId, userEmailMap);
    
    // Track which Slack users have active time-offs
    const usersWithActiveTimeOff = new Set();
    const emailToActiveTimeOff = new Map();
    
    let updated = 0;
    let cleared = 0;
    let errors = 0;
    
    // Update statuses for users with active time-offs
    for (const timeOff of activeTimeOffs) {
      try {
        // Get employee email from PeopleForce
        const employeeId = timeOff.employee_id || timeOff.employee?.id;
        const employeeEmail = timeOff.employee?.email || timeOff.email;
        
        if (!employeeEmail && !employeeId) {
          console.warn(`⚠️  No employee email or ID found for time-off ID ${timeOff.id}`);
          continue;
        }
        
        // Try to find employee by email if available
        let employee = null;
        if (employeeEmail) {
          employee = await findEmployeeByEmail(employeeEmail);
        }
        
        const email = (employee?.email || employee?.contact_email || employeeEmail || '').toLowerCase();
        const slackUserId = emailToSlackId[email];
        
        if (!slackUserId) {
          console.warn(`⚠️  Slack user not found for email: ${email}`);
          console.warn(`   Available Slack emails: ${Object.keys(emailToSlackId).slice(0, 5).join(', ')}...`);
          console.warn(`   Time-off employee data:`, {
            employeeId: employee?.id || employeeId,
            employeeEmail: employeeEmail,
            employeeEmailFromAPI: employee?.email,
            contactEmail: employee?.contact_email
          });
          continue;
        }
        
        console.log(`✅ Found Slack user ${slackUserId} for email ${email}`);
        
        // Update status for this user
        await updateSlackStatus(client, slackUserId, timeOff, userClient);
        usersWithActiveTimeOff.add(slackUserId);
        emailToActiveTimeOff.set(email, timeOff);
        updated++;
      } catch (error) {
        console.error(`Error processing time-off ${timeOff.id}:`, error.message);
        errors++;
      }
    }
    
    // Clear statuses for users who previously had time-offs but don't anymore
    // Check all Slack users and see if they have a status that should be cleared
    for (const [slackUserId, email] of Object.entries(slackUserIdToEmail)) {
      // Skip if this user has an active time-off
      if (usersWithActiveTimeOff.has(slackUserId)) {
        continue;
      }
      
      try {
        // Get current user profile to check if they have a status
        const profile = await client.users.profile.get({ user: slackUserId });
        const currentStatus = profile.profile?.status_text || '';
        const currentEmoji = profile.profile?.status_emoji || '';
        
        // Check if status looks like a time-off status (contains common leave-related keywords)
        const leaveKeywords = ['vacation', 'sick', 'leave', 'time off', 'holiday', 'personal', 'maternity', 'paternity', 'till'];
        const hasLeaveStatus = leaveKeywords.some(keyword => 
          currentStatus.toLowerCase().includes(keyword.toLowerCase())
        );
        
        // If user has a leave-related status but no active time-off, clear it
        if (hasLeaveStatus || currentEmoji) {
          // Double-check: get all approved time-offs for this user to be sure
          const today = new Date().toISOString().split('T')[0];
          const allApprovedTimeOffs = await getTimeOffs(today, today, 'approved');
          
          const hasAnyActiveTimeOff = allApprovedTimeOffs.some(to => {
            const toEmail = (to.employee?.email || to.email || '').toLowerCase();
            return toEmail === email;
          });
          
          // If no active approved time-off found, clear the status
          // (This handles cases where leave was canceled, rejected, or withdrawn)
          if (!hasAnyActiveTimeOff) {
            await clearSlackStatus(client, slackUserId, userClient);
            cleared++;
            console.log(`🧹 Cleared status for user ${slackUserId} (${email}) - leave was canceled/rejected/ended`);
          }
        }
      } catch (error) {
        // Ignore errors for users we can't check
        if (error.message?.includes('not_allowed_token_type')) {
          // Can't read profiles with bot token, skip
          continue;
        }
      }
    }
    
    console.log(`✅ Sync complete: ${updated} updated, ${cleared} cleared, ${errors} errors`);
    return { updated, cleared, errors };
  } catch (error) {
    console.error('❌ Error syncing time-offs:', error.message);
    throw error;
  }
}

/**
 * Start scheduled sync job
 * @param {Object} client - Bot client
 * @param {Object} userEmailMap - Email to Slack ID mapping
 * @param {string} schedule - Cron schedule
 * @param {Object} userClient - User token client for status updates (optional)
 */
export function startScheduledSync(client, userEmailMap = {}, schedule = '0 9 * * *', userClient = null) {
  // Default: Run every day at 9 AM
  console.log(`⏰ Starting scheduled sync job (cron: ${schedule})`);
  
  nodeCron.schedule(schedule, async () => {
    console.log(`\n🕐 Running scheduled sync at ${new Date().toISOString()}`);
    await syncTimeOffsToSlack(client, userEmailMap, userClient);
  });
  
  // Also run once immediately on startup
  syncTimeOffsToSlack(client, userEmailMap, userClient).catch(console.error);
}

