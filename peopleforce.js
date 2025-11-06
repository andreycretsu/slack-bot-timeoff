import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

// Use v3 API - base URL should be /api/public/v3
const PEOPLEFORCE_API_URL = process.env.PEOPLEFORCE_API_URL || 'https://app.peopleforce.io/api/public/v3';
const PEOPLEFORCE_API_KEY = process.env.PEOPLEFORCE_API_KEY;

/**
 * Get PeopleForce API headers
 */
function getHeaders() {
  return {
    'X-API-KEY': PEOPLEFORCE_API_KEY,
    'Content-Type': 'application/json',
  };
}

/**
 * Find employee by email in PeopleForce
 */
export async function findEmployeeByEmail(email) {
  try {
    // Use emails[] query param to filter by email
    const response = await axios.get(`${PEOPLEFORCE_API_URL}/employees`, {
      headers: getHeaders(),
      params: {
        'emails[]': email,
        status: 'active',
      },
    });
    
    // Response format: { data: [...] } or direct array
    const employees = response.data?.data || response.data || [];
    
    // Find employee by email (in case multiple returned)
    const employee = employees.find(emp => 
      emp.email?.toLowerCase() === email.toLowerCase() ||
      emp.contact_email?.toLowerCase() === email.toLowerCase()
    );
    
    return employee || (employees.length > 0 ? employees[0] : null);
  } catch (error) {
    console.error('Error finding employee by email:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get all time-off types from PeopleForce
 */
export async function getTimeOffTypes() {
  try {
    const response = await axios.get(`${PEOPLEFORCE_API_URL}/leave_types`, {
      headers: getHeaders(),
    });
    
    return response.data?.data || response.data || [];
  } catch (error) {
    console.error('Error fetching time-off types:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get a specific leave type by ID (to check required fields)
 */
export async function getLeaveTypeById(leaveTypeId) {
  try {
    const response = await axios.get(`${PEOPLEFORCE_API_URL}/leave_types/${leaveTypeId}`, {
      headers: getHeaders(),
    });
    
    return response.data?.data || response.data;
  } catch (error) {
    console.error('Error fetching leave type details:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Upload a document to PeopleForce (if API supports it)
 * @param {string} fileUrl - URL of the file to upload
 * @param {string} fileName - Name of the file
 * @returns {string|null} - Document ID or URL if successful
 */
export async function uploadDocument(fileUrl, fileName) {
  try {
    // Note: Check PeopleForce API docs for document upload endpoint
    // This is a placeholder - you'll need to implement based on PeopleForce API
    console.log(`📎 Uploading document to PeopleForce: ${fileName} from ${fileUrl}`);
    
    // TODO: Implement document upload to PeopleForce API
    // Example endpoint might be: POST /api/public/v3/leave_requests/{id}/documents
    // Or: POST /api/public/v3/documents
    
    return null; // Return document ID when implemented
  } catch (error) {
    console.error('Error uploading document to PeopleForce:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Create a time-off request in PeopleForce
 * @param {number} employeeId - Employee ID
 * @param {number} timeOffTypeId - Leave type ID
 * @param {string} startDate - Start date (YYYY-MM-DD)
 * @param {string} endDate - End date (YYYY-MM-DD)
 * @param {string} description - Reason/description for leave
 * @param {Array} entries - Optional array of leave request entries for partial days
 * @param {boolean} skipApproval - Optional flag to skip approval (for testing)
 * @param {string} documentUrl - Optional URL to attached document
 */
export async function createTimeOffRequest(employeeId, timeOffTypeId, startDate, endDate, description = '', entries = null, skipApproval = false, documentUrl = null) {
  try {
    const payload = {
      employee_id: employeeId,
      leave_type_id: timeOffTypeId,
      starts_on: startDate,
      ends_on: endDate,
      description: description, // Note: API uses 'description', not 'reason'
    };
    
    // Add optional fields if provided
    if (entries && Array.isArray(entries) && entries.length > 0) {
      payload.leave_request_entries = entries;
    }
    
    if (skipApproval === true) {
      payload.skip_approval = true;
    }
    
    const response = await axios.post(
      `${PEOPLEFORCE_API_URL}/leave_requests`,
      payload,
      {
        headers: getHeaders(),
      }
    );
    
    return response.data?.data || response.data;
  } catch (error) {
    console.error('Error creating time-off request:', error.response?.data || error.message);
    if (error.response?.data) {
      console.error('API Error Details:', JSON.stringify(error.response.data, null, 2));
    }
    throw error;
  }
}

/**
 * Get time-offs for a specific date range
 */
export async function getTimeOffs(startDate, endDate, status = 'approved') {
  try {
    const response = await axios.get(`${PEOPLEFORCE_API_URL}/leave_requests`, {
      headers: getHeaders(),
      params: {
        starts_on: startDate,
        ends_on: endDate,
        'states[]': status,
        page: 1,
      },
    });
    
    return response.data?.data || response.data || [];
  } catch (error) {
    console.error('Error fetching time-offs:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Get active time-offs (currently ongoing)
 */
export async function getActiveTimeOffs(date = null) {
  const today = date || new Date().toISOString().split('T')[0];
  
  try {
    const timeOffs = await getTimeOffs(today, today, 'approved');
    
    // Filter to only include time-offs that are active today
    return timeOffs.filter(timeOff => {
      const startDate = new Date(timeOff.starts_on || timeOff.start_date);
      const endDate = new Date(timeOff.ends_on || timeOff.end_date);
      const checkDate = new Date(today);
      
      return checkDate >= startDate && checkDate <= endDate;
    });
  } catch (error) {
    console.error('Error fetching active time-offs:', error.response?.data || error.message);
    throw error;
  }
}

