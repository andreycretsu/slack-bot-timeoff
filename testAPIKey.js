import dotenv from 'dotenv';
import axios from 'axios';

dotenv.config();

const API_KEY = process.env.PEOPLEFORCE_API_KEY;
const API_URL = process.env.PEOPLEFORCE_API_URL || 'https://demo.stage-81y92gtmor-peopleforce.dev/api/public/v3';

console.log('🧪 Testing PeopleForce API Key...\n');
console.log('API URL:', API_URL);
console.log('API Key:', API_KEY ? `${API_KEY.substring(0, 20)}...` : '❌ NOT SET');
console.log('');

async function testAPIKey() {
  try {
    // Test 1: Get employees
    console.log('1️⃣  Testing employees endpoint...');
    const employeesResponse = await axios.get(`${API_URL}/employees`, {
      headers: {
        'X-API-KEY': API_KEY,
        'Accept': 'application/json',
      },
      params: {
        status: 'active',
        page: 1,
      },
    });
    
    if (employeesResponse.data?.data) {
      console.log('   ✅ SUCCESS! Found', employeesResponse.data.data.length, 'employees');
    } else {
      console.log('   ❌ Unexpected response format');
    }
    
    // Test 2: Get leave requests
    console.log('\n2️⃣  Testing leave requests endpoint...');
    const leaveResponse = await axios.get(`${API_URL}/leave_requests`, {
      headers: {
        'X-API-KEY': API_KEY,
        'Accept': 'application/json',
      },
      params: {
        'states[]': 'approved',
        page: 1,
      },
    });
    
    if (leaveResponse.data?.data) {
      console.log('   ✅ SUCCESS! Found', leaveResponse.data.data.length, 'leave requests');
    } else {
      console.log('   ❌ Unexpected response format');
    }
    
    // Test 3: Get active time-offs
    console.log('\n3️⃣  Testing active time-offs (today)...');
    const today = new Date().toISOString().split('T')[0];
    const activeResponse = await axios.get(`${API_URL}/leave_requests`, {
      headers: {
        'X-API-KEY': API_KEY,
        'Accept': 'application/json',
      },
      params: {
        starts_on: today,
        ends_on: today,
        'states[]': 'approved',
        page: 1,
      },
    });
    
    if (activeResponse.data?.data) {
      const activeTimeOffs = activeResponse.data.data.filter(to => {
        const startDate = new Date(to.starts_on || to.start_date);
        const endDate = new Date(to.ends_on || to.end_date);
        const todayDate = new Date(today);
        return todayDate >= startDate && todayDate <= endDate;
      });
      console.log('   ✅ SUCCESS! Found', activeTimeOffs.length, 'active time-offs today');
      
      if (activeTimeOffs.length > 0) {
        console.log('\n   Active time-offs:');
        activeTimeOffs.forEach((to, i) => {
          const employee = to.employee || {};
          console.log(`   ${i + 1}. ${employee.first_name || 'Unknown'} ${employee.last_name || ''} - ${to.leave_type || 'N/A'} (${to.starts_on || 'N/A'} to ${to.ends_on || 'N/A'})`);
        });
      }
    } else {
      console.log('   ❌ Unexpected response format');
    }
    
    console.log('\n✅ API Key is working correctly!');
    
  } catch (error) {
    console.error('\n❌ ERROR:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Message:', error.response.data?.message || error.response.statusText);
      if (error.response.status === 401) {
        console.error('\n   ⚠️  Invalid API key. Check your .env file.');
      }
    }
    process.exit(1);
  }
}

testAPIKey();

