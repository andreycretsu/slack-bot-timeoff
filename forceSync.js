import dotenv from 'dotenv';
import pkg from '@slack/bolt';
const { App } = pkg;
import { WebClient } from '@slack/web-api';
import { syncTimeOffsToSlack } from './slackStatusSync.js';

dotenv.config();

const botToken = process.env.SLACK_BOT_TOKEN;
const userToken = process.env.SLACK_USER_TOKEN || process.env.SLACK_BOT_TOKEN;

const app = new App({
  token: botToken,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

const userClient = new WebClient(userToken);

async function forceSync() {
  console.log('🚀 FORCE SYNC - Testing sync functionality...\n');
  
  try {
    // Test connection
    const auth = await app.client.auth.test();
    console.log('✅ Connected to Slack');
    console.log(`   Team: ${auth.team}`);
    console.log(`   User: ${auth.user}\n`);
    
    // Run sync
    console.log('🔄 Starting force sync...\n');
    const result = await syncTimeOffsToSlack(app.client, {}, userClient);
    
    console.log('\n📊 SYNC RESULTS:');
    console.log(`   ✅ Updated: ${result.updated || 0} status(es)`);
    console.log(`   🧹 Cleared: ${result.cleared || 0} status(es)`);
    console.log(`   ❌ Errors: ${result.errors || 0}`);
    
    if (result.updated > 0 || result.cleared > 0) {
      console.log('\n✅ Force sync completed successfully!');
      console.log('   Check Slack to see updated statuses.');
    } else {
      console.log('\n⚠️  No statuses were updated or cleared.');
      console.log('   This might mean:');
      console.log('   - No active time-offs found in PeopleForce');
      console.log('   - No matching Slack users found');
      console.log('   - All statuses are already up-to-date');
    }
    
  } catch (error) {
    console.error('\n❌ Force sync failed:', error.message);
    if (error.data) {
      console.error('Error details:', error.data);
    }
    process.exit(1);
  }
  
  process.exit(0);
}

forceSync();

