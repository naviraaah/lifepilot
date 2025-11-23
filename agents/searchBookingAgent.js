const axios = require('axios');
const path = require('path');

// Load environment variables from backend/.env
// Try to load dotenv if available (it might already be loaded by backend/index.js)
try {
  require('dotenv').config({ path: path.join(__dirname, '../backend/.env') });
} catch (e) {
  // dotenv might already be loaded or not available
}

// Configuration
const AGI_API_KEY = process.env.AGI_API_KEY || 'No-key';
const BASE_URL = 'https://api.agi.tech/v1';

// Validate API key
if (!AGI_API_KEY || AGI_API_KEY === 'your_api_key') {
  console.warn('Warning: AGI_API_KEY is not set or is using default value');
}

// Helper function to sleep
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Creates a new AGI session
 * @param {string} agentName - Agent name (default: 'agi-0')
 * @returns {Promise<string>} Session ID
 */
async function createSession(agentName = 'agi-0') {
  if (!AGI_API_KEY || AGI_API_KEY === 'No-key') {
    throw new Error('AGI_API_KEY is not configured. Please set AGI_API_KEY in your .env file.');
  }

  try {
    console.log('Creating session...');
    console.log(`Using API key: ${AGI_API_KEY.substring(0, 10)}...${AGI_API_KEY.substring(AGI_API_KEY.length - 4)}`);
    const response = await axios.post(
      `${BASE_URL}/sessions`,
      { agent_name: agentName },
      {
        headers: {
          'Authorization': `Bearer ${AGI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
    
    return response.data.session_id;
  } catch (error) {
    const errorDetails = error.response?.data || error.message;
    const statusCode = error.response?.status;
    
    console.error('Error creating session:', {
      status: statusCode,
      data: errorDetails,
      message: error.message
    });
    
    if (statusCode === 401) {
      throw new Error('Authentication failed. Please check your AGI_API_KEY in the .env file. The API key may be invalid or expired.');
    }
    
    throw new Error(`Failed to create session: ${error.message}${statusCode ? ` (Status: ${statusCode})` : ''}`);
  }
}

/**
 * Sends a message/task to the agent
 * @param {string} sessionId - Session ID 
 * @param {string} message - Task message
 */
async function sendMessage(sessionId, message) {
  try {
    await axios.post(
      `${BASE_URL}/sessions/${sessionId}/message`,
      { message },
      {
        headers: {
          'Authorization': `Bearer ${AGI_API_KEY}`,
          'Content-Type': 'application/json'
        }
      }
    );
  } catch (error) {
    console.error('Error sending message:', error.response?.data || error.message);
    throw new Error(`Failed to send message: ${error.message}`);
  }
}

/**
 * Gets the status of the session
 * @param {string} sessionId - Session ID
 * @returns {Promise<Object>} Status object
 */
async function getStatus(sessionId) {
  try {
    const response = await axios.get(
      `${BASE_URL}/sessions/${sessionId}/status`,
      {
        headers: {
          'Authorization': `Bearer ${AGI_API_KEY}`
        }
      }
    );
    return response.data;
  } catch (error) {
    console.error('Error getting status:', error.response?.data || error.message);
    throw new Error(`Failed to get status: ${error.message}`);
  }
}

/**
 * Gets all messages from the session
 * @param {string} sessionId - Session ID
 * @returns {Promise<Array>} Array of messages
 */
async function getMessages(sessionId) {
  try {
    const response = await axios.get(
      `${BASE_URL}/sessions/${sessionId}/messages`,
      {
        headers: {
          'Authorization': `Bearer ${AGI_API_KEY}`
        }
      }
    );
    return response.data.messages || [];
  } catch (error) {
    console.error('Error getting messages:', error.response?.data || error.message);
    throw new Error(`Failed to get messages: ${error.message}`);
  }
}

/**
 * Deletes a session
 * @param {string} sessionId - Session ID
 */
async function deleteSession(sessionId) {
  try {
    await axios.delete(
      `${BASE_URL}/sessions/${sessionId}`,
      {
        headers: {
          'Authorization': `Bearer ${AGI_API_KEY}`
        }
      }
    );
  } catch (error) {
    console.error('Error deleting session:', error.response?.data || error.message);
    // Don't throw error on cleanup failure
  }
}

/**
 * Monitors the session until completion
 * @param {string} sessionId - Session ID
 * @param {number} pollInterval - Polling interval in milliseconds (default: 5000)
 * @param {number} maxWaitTime - Maximum wait time in milliseconds (default: 600000 = 10 minutes)
 * @returns {Promise<Object>} Final status
 */
async function monitorSession(sessionId, pollInterval = 5000, maxWaitTime = 600000) {
  const startTime = Date.now();
  let lastMessageCount = 0;
  let pollCount = 0;
  
  console.log(`[monitorSession] Starting to monitor session: ${sessionId}`);
  console.log(`[monitorSession] Poll interval: ${pollInterval}ms, Max wait time: ${maxWaitTime}ms`);
  
  while (true) {
    pollCount++;
    const elapsed = Math.round((Date.now() - startTime) / 1000);
    
    try {
      const status = await getStatus(sessionId);
      
      // Log status every few polls or when status changes
      if (pollCount === 1 || pollCount % 5 === 0) {
        console.log(`[monitorSession] Poll #${pollCount} - Status: ${status.status} (${elapsed}s elapsed)`);
      }
      
      // Get messages to see what agent is doing
      try {
        const messages = await getMessages(sessionId);
        const currentMessageCount = messages.length;
        
        // If new messages appeared, log them
        if (currentMessageCount > lastMessageCount) {
          const newMessages = messages.slice(lastMessageCount);
          console.log(`[monitorSession] 📨 New messages detected (${newMessages.length} new)`);
          
          newMessages.forEach((msg, index) => {
            if (msg.type === 'message') {
              console.log(`[monitorSession] 💬 Message ${lastMessageCount + index + 1}:`);
              console.log(`[monitorSession]    Role: ${msg.role}`);
              if (msg.content) {
                const contentPreview = msg.content.substring(0, 200);
                console.log(`[monitorSession]    Content: ${contentPreview}${msg.content.length > 200 ? '...' : ''}`);
              }
            } else if (msg.type === 'action') {
              console.log(`[monitorSession] ⚙️  Action ${lastMessageCount + index + 1}:`);
              console.log(`[monitorSession]    Type: ${msg.action_type || 'unknown'}`);
              if (msg.description) {
                console.log(`[monitorSession]    Description: ${msg.description}`);
              }
            } else if (msg.type === 'search') {
              console.log(`[monitorSession] 🔍 Search ${lastMessageCount + index + 1}:`);
              console.log(`[monitorSession]    Query: ${msg.query || 'N/A'}`);
              if (msg.url) {
                console.log(`[monitorSession]    URL: ${msg.url}`);
              }
            } else if (msg.type === 'navigation') {
              console.log(`[monitorSession] 🧭 Navigation ${lastMessageCount + index + 1}:`);
              console.log(`[monitorSession]    URL: ${msg.url || 'N/A'}`);
            } else if (msg.type === 'click' || msg.type === 'type' || msg.type === 'scroll') {
              console.log(`[monitorSession] 🖱️  ${msg.type.toUpperCase()} ${lastMessageCount + index + 1}:`);
              if (msg.selector) {
                console.log(`[monitorSession]    Selector: ${msg.selector}`);
              }
              if (msg.text) {
                console.log(`[monitorSession]    Text: ${msg.text}`);
              }
            } else if (msg.type === 'DONE') {
              console.log(`[monitorSession] ✅ Task completed!`);
              if (msg.content) {
                const contentPreview = msg.content.substring(0, 200);
                console.log(`[monitorSession]    Result preview: ${contentPreview}${msg.content.length > 200 ? '...' : ''}`);
              }
            } else {
              console.log(`[monitorSession] 📋 ${msg.type.toUpperCase()} ${lastMessageCount + index + 1}:`);
              console.log(`[monitorSession]    Data: ${JSON.stringify(msg).substring(0, 150)}...`);
            }
          });
          
          lastMessageCount = currentMessageCount;
        }
      } catch (msgError) {
        // Don't fail monitoring if we can't get messages
        if (pollCount % 10 === 0) {
          console.log(`[monitorSession] ⚠️  Could not fetch messages (this is okay): ${msgError.message}`);
        }
      }
      
      // Check if finished or error
      if (status.status === 'finished') {
        console.log(`[monitorSession] ✅ Session completed successfully after ${elapsed}s`);
        return status;
      }
      
      if (status.status === 'error') {
        console.log(`[monitorSession] ❌ Session error after ${elapsed}s`);
        console.log(`[monitorSession]    Error: ${status.error || 'Unknown error'}`);
        return status;
      }
      
      // Show progress indicator
      if (pollCount % 10 === 0) {
        const progressPercent = Math.min(100, Math.round((elapsed / (maxWaitTime / 1000)) * 100));
        console.log(`[monitorSession] ⏳ Still processing... (${progressPercent}% of max time)`);
      }
      
      // Check for timeout
      if (Date.now() - startTime > maxWaitTime) {
        console.log(`[monitorSession] ⏰ Timeout reached after ${elapsed}s`);
        throw new Error('Session monitoring timeout');
      }
      
      await sleep(pollInterval);
    } catch (error) {
      if (error.message === 'Session monitoring timeout') {
        throw error;
      }
      console.error(`[monitorSession] ⚠️  Error during monitoring (continuing): ${error.message}`);
      await sleep(pollInterval);
    }
  }
}

/**
 * Main function to run search and booking agent
 * @param {string} task - The task description (e.g., "Compare prices", "Book appointment")
 * @param {Object} options - Additional options
 * @param {number} options.pollInterval - Polling interval in ms (default: 5000)
 * @param {number} options.maxWaitTime - Max wait time in ms (default: 600000)
 * @returns {Promise<Object>} Result object with action, summary, and details
 */
async function runSearchBookingAgent(task, options = {}) {
  console.log('[searchBookingAgent] runSearchBookingAgent called');
  console.log('[searchBookingAgent] Task:', task);
  console.log('[searchBookingAgent] Options:', options);
  
  const { pollInterval = 5000, maxWaitTime = 600000 } = options;
  let sessionId = null;
  
  try {
    // Validate API key before proceeding
    if (!AGI_API_KEY || AGI_API_KEY === 'your_api_key') {
      return {
        action: 'search_booking',
        status: 'error',
        summary: 'AGI_API_KEY is not configured. Please set AGI_API_KEY in backend/.env file.',
        details: { 
          error: 'Missing API key',
          hint: 'Add AGI_API_KEY=your_actual_key to backend/.env'
        },
        sessionId: null,
        task: task
      };
    }

    // Create session
    console.log('Creating AGI session...');
    console.log(`Using API key: ${AGI_API_KEY.substring(0, 10)}...${AGI_API_KEY.substring(AGI_API_KEY.length - 4)}`);
    sessionId = await createSession();
    console.log(`Session created: ${sessionId}`);
    
    // Send task
    console.log('Sending task to agent...');
    await sendMessage(sessionId, task);
    
    // Monitor progress
    console.log('Monitoring agent progress...');
    const finalStatus = await monitorSession(sessionId, pollInterval, maxWaitTime);
    
    if (finalStatus.status === 'error') {
      throw new Error(`Agent error: ${finalStatus.error || 'Unknown error'}`);
    }
    
    // Get results
    console.log('Retrieving results...');
    const messages = await getMessages(sessionId);
    
    // Process results - find DONE message
    let results = null;
    let summary = null;
    
    for (const msg of messages) {
      if (msg.type === 'DONE') {
        results = msg.content;
        // Try to parse if it's JSON
        try {
          results = JSON.parse(msg.content);
        } catch (e) {
          // Not JSON, keep as string
        }
      } else if (msg.type === 'message' && msg.role === 'assistant') {
        summary = msg.content;
      }
    }
    
    return {
      action: 'search_booking',
      status: 'completed',
      summary: summary || 'Task completed successfully',
      details: results || messages,
      sessionId: sessionId,
      task: task
    };
    
  } catch (error) {
    console.error('Error in search booking agent:', error);
    return {
      action: 'search_booking',
      status: 'error',
      summary: `Error: ${error.message}`,
      details: { error: error.message },
      sessionId: sessionId,
      task: task
    };
  } finally {
    // Cleanup
    if (sessionId) {
      console.log('Cleaning up session...');
      await deleteSession(sessionId);
    }
  }
}

/**
 * Search for best options (prices, services, etc.)
 * @param {string} query - Search query (e.g., "Compare Sony WH-1000XM5 prices on Amazon, Best Buy, and Target")
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Search results
 */
async function searchBestOptions(query, options = {}) {
  console.log('[searchBookingAgent] searchBestOptions called');
  console.log('[searchBookingAgent] Query:', query);
  console.log('[searchBookingAgent] Options:', options);
  
  const task = `${query}. Return results as JSON with comparison details.`;
  return await runSearchBookingAgent(task, options);
}

/**
 * Book an appointment
 * @param {string} appointmentType - Type of appointment (e.g., "dentist", "doctor", "haircut")
 * @param {Object} preferences - Appointment preferences
 * @param {string} preferences.date - Preferred date
 * @param {string} preferences.time - Preferred time
 * @param {string} preferences.location - Preferred location
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Booking result
 */
async function bookAppointment(appointmentType, preferences = {}, options = {}) {
  console.log('[searchBookingAgent] bookAppointment called');
  console.log('[searchBookingAgent] Appointment Type:', appointmentType);
  console.log('[searchBookingAgent] Preferences:', preferences);
  console.log('[searchBookingAgent] Options:', options);
  
  const { date, time, location } = preferences;
  
  // Build detailed task with comprehensive instructions
  let task = `You are LifePilot — the user's AI pilot for the boring operations of everyday life.

Your job is to autonomously schedule a ${appointmentType} appointment for the user using multi-step reasoning and real tool execution.

GOAL:
Given the user request, find a ${appointmentType} provider near the target location, filter available times, select the best slot, fill the booking form, confirm the appointment, and deliver a final summary.

USER REQUEST:
Book a ${appointmentType} appointment${date ? ` for ${date}` : ''}${time ? ` at ${time}` : ''}${location ? ` near ${location}` : ''}.

WORKFLOW STEPS:

1. Parse the user's natural language request and extract all constraints:
   - Location requirement: ${location || 'not specified'}
   - Date preference: ${date || 'not specified'}
   - Time preference: ${time || 'not specified'}

2. Search for ${appointmentType} providers in the target area using web search.

3. Filter the results based on:
   - User location requirement (prioritize closest matches)
   - Time window availability
   - Next available slots that match preferences

4. Select the best provider using:
   - Earliest time that matches all constraints
   - Highest rating (if available)
   - Best location match
   - Availability confirmation

5. Navigate to the booking page and fill the appointment booking form with:
   - Selected date and time
   - User information (use reasonable defaults if needed)
   - Appointment type/reason

6. Submit the booking form and confirm the appointment.

7. Retrieve confirmation details including:
   - Provider name and contact information
   - Appointment date and time
   - Address/location
   - Confirmation ID or reference number
   - Any additional instructions

8. Return a clean, structured summary in JSON format with:
   - provider: { name, address, phone, rating }
   - appointment: { date, time, confirmationId, type }
   - location: { address, city, zipCode }
   - summary: "Human-readable confirmation message"

AGENT RULES:
- Never ask the user to click anything or make manual choices.
- Don't require user to choose between options — make the decision automatically based on best match.
- If tool results are incomplete, make your best inference and proceed.
- Always think step-by-step before selecting tools.
- If exact criteria are impossible:
  * Suggest closest available times
  * Offer nearby alternative locations
  * Provide alternative appointment types if applicable
  * Present the next best set of options
  * Continue progress autonomously with the best available option

- Be proactive and autonomous — complete the entire booking process without user intervention.
- If booking requires information you don't have, use reasonable defaults or infer from context.
- Always confirm the booking and retrieve confirmation details before completing.

Return the final result as a JSON object with all booking details.`;

  return await runSearchBookingAgent(task, options);
}

/**
 * Check prices across multiple retailers
 * @param {string} product - Product name to search for
 * @param {Array<string>} retailers - Array of retailer names/domains (e.g., ["amazon.com", "bestbuy.com"])
 * @param {Object} options - Additional options
 * @param {number} options.pollInterval - Polling interval in ms (default: 5000)
 * @param {number} options.maxWaitTime - Max wait time in ms (default: 600000)
 * @returns {Promise<Object>} Price comparison results
 */
async function checkPrices(product, retailers, options = {}) {
  console.log('[searchBookingAgent] checkPrices called');
  console.log('[searchBookingAgent] Product:', product);
  console.log('[searchBookingAgent] Retailers:', retailers);
  console.log('[searchBookingAgent] Options:', options);
  
  const { pollInterval = 5000, maxWaitTime = 600000 } = options;
  let sessionId = null;

  // Validate inputs
  if (!product) {
    throw new Error('Product name is required');
  }
  if (!retailers || !Array.isArray(retailers) || retailers.length === 0) {
    throw new Error('Retailers array is required and must not be empty');
  }

  // Validate API key
  if (!AGI_API_KEY || AGI_API_KEY === 'No-key') {
    return {
      action: 'price_comparison',
      status: 'error',
      summary: 'AGI_API_KEY is not configured. Please set AGI_API_KEY in backend/.env file.',
      details: { 
        error: 'Missing API key',
        hint: 'Add AGI_API_KEY=your_actual_key to backend/.env'
      },
      product: product,
      retailers: retailers
    };
  }

  try {
    // Create session with fast agent
    console.log('Creating AGI session with fast agent...');
    sessionId = await createSession('agi-0-fast');
    console.log(`Session created: ${sessionId}`);

    // Format retailers list
    const retailersList = retailers.map(r => `- ${r}`).join('\n');

    // Create detailed task message
    const message = `
Compare prices for: ${product}

Check these retailers:
${retailersList}

For each retailer, provide:
- Current price
- Availability (in stock / out of stock)
- Product URL

Return as JSON array.
    `.trim();

    // Send task
    console.log('Sending price comparison task...');
    await sendMessage(sessionId, message);

    // Monitor progress
    console.log('Monitoring agent progress...');
    const startTime = Date.now();
    
    while (true) {
      const status = await getStatus(sessionId);
      
      if (status.status === 'finished') {
        // Get messages
        const messages = await getMessages(sessionId);
        
        // Find DONE message
        for (const msg of messages) {
          if (msg.type === 'DONE') {
            let content = msg.content;
            
            // Try to parse JSON
            try {
              content = JSON.parse(content);
            } catch (e) {
              // Not JSON, keep as string
            }
            
            return {
              action: 'price_comparison',
              status: 'completed',
              summary: `Price comparison completed for ${product}`,
              details: content,
              product: product,
              retailers: retailers,
              sessionId: sessionId
            };
          }
        }
        
        // If no DONE message found, return all messages
        return {
          action: 'price_comparison',
          status: 'completed',
          summary: `Price comparison completed for ${product}`,
          details: messages,
          product: product,
          retailers: retailers,
          sessionId: sessionId
        };
      } else if (status.status === 'error') {
        throw new Error('Task failed: ' + (status.error || 'Unknown error'));
      }
      
      // Check for timeout
      if (Date.now() - startTime > maxWaitTime) {
        throw new Error('Price comparison timeout');
      }
      
      await sleep(pollInterval);
    }

  } catch (error) {
    console.error('Error in price comparison:', error);
    return {
      action: 'price_comparison',
      status: 'error',
      summary: `Error: ${error.message}`,
      details: { error: error.message },
      product: product,
      retailers: retailers,
      sessionId: sessionId
    };
  } finally {
    // Cleanup
    if (sessionId) {
      console.log('Cleaning up session...');
      await deleteSession(sessionId);
    }
  }
}

/**
 * Research product specifications, prices, and reviews
 * @param {string} productName - Product name to research
 * @param {Object} options - Additional options
 * @param {number} options.pollInterval - Polling interval in ms (default: 5000)
 * @param {number} options.maxWaitTime - Max wait time in ms (default: 600000)
 * @returns {Promise<Object>} Research results
 */
async function researchProduct(productName, options = {}) {
  console.log('[searchBookingAgent] researchProduct called');
  console.log('[searchBookingAgent] Product Name:', productName);
  console.log('[searchBookingAgent] Options:', options);
  
  const { pollInterval = 5000, maxWaitTime = 600000 } = options;
  let sessionId = null;

  // Validate input
  if (!productName) {
    throw new Error('Product name is required');
  }

  // Validate API key
  if (!AGI_API_KEY || AGI_API_KEY === 'No-key') {
    return {
      action: 'product_research',
      status: 'error',
      summary: 'AGI_API_KEY is not configured. Please set AGI_API_KEY in backend/.env file.',
      details: { 
        error: 'Missing API key',
        hint: 'Add AGI_API_KEY=your_actual_key to backend/.env'
      },
      productName: productName
    };
  }

  try {
    // Create session with agi-0 agent
    console.log('Creating AGI session for product research...');
    sessionId = await createSession('agi-0');
    console.log(`Session created: ${sessionId}`);

    // Create research message with exact format from Python code
    const message = `
Research: ${productName}

Gather:

1. Specifications and key features

2. Current prices across 3-5 retailers

3. Average rating and review summary

4. Availability status

Return as JSON with all information.
    `.trim();

    // Send task
    console.log('Sending product research task...');
    await sendMessage(sessionId, message);

    // Wait for completion
    console.log('Monitoring agent progress...');
    const startTime = Date.now();
    
    while (true) {
      const status = await getStatus(sessionId);
      
      if (status.status === 'finished') {
        // Get messages
        const messages = await getMessages(sessionId);
        
        // Find DONE message
        for (const msg of messages) {
          if (msg.type === 'DONE') {
            let content = msg.content;
            
            // Try to parse JSON
            try {
              content = JSON.parse(content);
            } catch (e) {
              // Not JSON, keep as string
            }
            
            return {
              action: 'product_research',
              status: 'completed',
              summary: `Product research completed for ${productName}`,
              details: content,
              productName: productName,
              sessionId: sessionId
            };
          }
        }
        
        // If no DONE message found, return all messages
        return {
          action: 'product_research',
          status: 'completed',
          summary: `Product research completed for ${productName}`,
          details: messages,
          productName: productName,
          sessionId: sessionId
        };
      } else if (status.status === 'error') {
        throw new Error('Task failed: ' + (status.error || 'Unknown error'));
      }
      
      // Check for timeout
      if (Date.now() - startTime > maxWaitTime) {
        throw new Error('Product research timeout');
      }
      
      await sleep(pollInterval);
    }

  } catch (error) {
    console.error('Error in product research:', error);
    return {
      action: 'product_research',
      status: 'error',
      summary: `Error: ${error.message}`,
      details: { error: error.message },
      productName: productName,
      sessionId: sessionId
    };
  } finally {
    // Cleanup
    if (sessionId) {
      console.log('Cleaning up session...');
      await deleteSession(sessionId);
    }
  }
}

module.exports = {
  runSearchBookingAgent,
  searchBestOptions,
  bookAppointment,
  checkPrices,
  researchProduct,
  createSession,
  sendMessage,
  getStatus,
  getMessages,
  deleteSession,
  monitorSession
};

