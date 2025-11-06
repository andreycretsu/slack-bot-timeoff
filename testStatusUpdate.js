import dotenv from 'dotenv';
import pkg from '@slack/bolt';
const { App } = pkg;
import { WebClient } from '@slack/web-api';

dotenv.config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

// Use user token for status updates
const userToken = process.env.SLACK_USER_TOKEN || process.env.SLACK_BOT_TOKEN;
const userClient = new WebClient(userToken);

async function testStatusUpdate() {
  console.log('🧪 Testing Slack status update with mock data...\n');
  
  try {
    // Test connection
    const auth = await app.client.auth.test();
    console.log('✅ Connected to Slack');
    console.log(`   Team: ${auth.team}`);
    console.log(`   User: ${auth.user}\n`);
    
    // Get all users
    const users = await app.client.users.list();
    console.log(`📋 Found ${users.members.length} users in workspace\n`);
    
    // Find a user with email (for testing)
    const testUser = users.members.find(u => u.profile?.email && !u.is_bot && !u.deleted);
    
    if (!testUser) {
      console.log('❌ No user with email found for testing');
      process.exit(1);
    }
    
    console.log(`🎯 Testing with user: ${testUser.profile?.real_name || testUser.name}`);
    console.log(`   Email: ${testUser.profile?.email}\n`);
    
    // Mock time-off data
    const mockTimeOff = {
      start_date: '2025-11-05',
      end_date: '2025-11-10',
      time_off_type: {
        name: 'Vacation'
      },
      type_name: 'Vacation'
    };
    
    // Update status
    const emoji = ':palm_tree:';
    const dateRange = 'Nov 5 - Nov 10';
    const statusText = `Vacation until ${dateRange}`;
    const expiration = Math.floor((new Date('2025-11-11').getTime()) / 1000);
    
    console.log(`📝 Updating status:`);
    console.log(`   Emoji: ${emoji}`);
    console.log(`   Text: ${statusText}`);
    console.log(`   Expires: ${new Date(expiration * 1000).toLocaleString()}\n`);
    
    // Use userClient (with user token) for status updates
    await userClient.users.profile.set({
      user: testUser.id,
      profile: {
        status_text: statusText,
        status_emoji: emoji,
        status_expiration: expiration,
      },
    });
    
    console.log('✅ Status updated successfully!');
    console.log(`\n🎉 Check Slack - ${testUser.profile?.real_name}'s status should now show: ${emoji} ${statusText}`);
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.data) {
      console.error('Details:', error.data);
    }
  }
  
  process.exit(0);
}

testStatusUpdate();

