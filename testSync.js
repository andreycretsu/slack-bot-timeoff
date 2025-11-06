import dotenv from 'dotenv';
import pkg from '@slack/bolt';
const { App } = pkg;
import { syncTimeOffsToSlack } from './slackStatusSync.js';

dotenv.config();

const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET,
});

async function testSync() {
  console.log('🧪 Testing sync functionality...\n');
  
  try {
    console.log('1. Connecting to Slack...');
    await app.client.auth.test();
    console.log('✅ Connected to Slack\n');
    
    console.log('2. Fetching time-offs from PeopleForce and updating Slack statuses...\n');
    const result = await syncTimeOffsToSlack(app.client, {});
    
    console.log('\n📊 Results:');
    console.log(`   ✅ Updated: ${result.updated} status(es)`);
    console.log(`   ❌ Errors: ${result.errors}`);
    
    if (result.updated > 0) {
      console.log('\n🎉 Success! Check Slack to see updated statuses!');
    } else {
      console.log('\nℹ️  No active time-offs found or no matching employees.');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    if (error.response) {
      console.error('Response:', error.response.data);
    }
  }
  
  process.exit(0);
}

testSync();

