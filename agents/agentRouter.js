const runLifePilotAgent = require('./lifePilotAgent');
const { 
  runSearchBookingAgent, 
  searchBestOptions, 
  bookAppointment, 
  checkPrices, 
  researchProduct 
} = require('./searchBookingAgent');
const scheduleDentist = require('../tools/scheduleDentist');
const cancelSubscription = require('../tools/cancelSubscription');
const disputeCharge = require('../tools/disputeCharge');

/**
 * Agent Router - Analyzes user input and routes to appropriate agent
 * @param {string} userInput - User's natural language input
 * @param {Object} openai - OpenAI client instance
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Agent execution result
 */

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';
const AGENT_TIMEOUT = 15000; // 15 seconds timeout for primary agents

/**
 * OpenAI-based search agent as fallback when primary agents timeout
 * @param {string} userInput - User's natural language input
 * @param {Object} openai - OpenAI client instance
 * @returns {Promise<Object>} Search result
 */


/**
 * Conversational AI agent - handles general chat, questions, and context-aware responses
 * @param {string} userInput - User's natural language input
 * @param {Object} openai - OpenAI client instance
 * @param {boolean} isFallback - Whether this is a fallback call
 * @returns {Promise<Object>} Conversational response
 */
async function conversationalAgent(userInput, openai, isFallback = false) {
  console.log('[Conversational Agent] Processing query:', userInput);
  
  try {
    // Increased timeout to 20 seconds to allow OpenAI API to respond
    const timeoutPromise = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Conversational agent timeout')), 20000)
    );

    const apiPromise = openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are LifePilot, an AI assistant that helps manage life's boring tasks. You're friendly, conversational, and helpful.

Your capabilities include:
- Having natural conversations and answering questions
- Scheduling appointments (dentist, doctor, haircut, etc.)
- Managing subscriptions and cancellations
- Handling disputes and charges
- Comparing prices and researching products
- Finding restaurants, booking services, and more

When users greet you (hi, hello, hey):
- Respond warmly and naturally
- Keep it brief and friendly (1-2 sentences)
- Ask how you can help

When users ask about tasks or need help:
- Respond conversationally and helpfully
- Explain what you can do
- Ask for any details you need
- Be proactive and friendly

When users ask questions:
- Answer directly and conversationally
- Be helpful and clear
- Keep responses concise but complete

Always be conversational, friendly, and helpful. Respond naturally as if you're having a real conversation.`
        },
        {
          role: 'user',
          content: userInput
        }
      ],
      temperature: 0.7,
      max_tokens: 250,  // Shorter responses for faster replies
      stream: false  // Ensure no streaming for faster response
    });

    const response = await Promise.race([apiPromise, timeoutPromise]);
    
    if (!response || !response.choices || !response.choices[0] || !response.choices[0].message) {
      throw new Error('Invalid response from OpenAI API');
    }
    
    const content = response.choices[0].message.content;
    
    if (!content) {
      throw new Error('Empty response from OpenAI API');
    }

    return {
      action: 'conversation',
      status: 'completed',
      summary: content,
      details: { 
        response: content,
        type: 'conversational',
        conversational: true
      },
      routedAgent: 'conversational',
      intent: 'conversation',
      confidence: 0.9,
      originalInput: userInput,
      fallback: isFallback
    };
  } catch (error) {
    console.error('[Conversational Agent] Error:', error);
    console.error('[Conversational Agent] Error details:', {
      message: error.message,
      code: error.code,
      status: error.status,
      response: error.response?.data
    });
    
    // Provide a helpful error message
    let errorMessage = "I'm having trouble connecting right now. Please try again in a moment!";
    
    if (error.message && error.message.includes('timeout')) {
      errorMessage = "The request is taking longer than expected. Please try again!";
    } else if (error.message && (error.message.includes('API key') || error.status === 401)) {
      errorMessage = "There's an issue with the API configuration. Please check your OpenAI API key.";
    } else if (error.status === 429) {
      errorMessage = "I'm receiving too many requests right now. Please wait a moment and try again.";
    } else if (error.status === 500 || error.status >= 500) {
      errorMessage = "There's a server error. Please try again in a moment.";
    }
    
    // Return error response that frontend can handle
    return {
      action: 'conversation',
      status: 'error',
      summary: errorMessage,
      details: { 
        error: error.message,
        type: 'conversational',
        conversational: true
      },
      routedAgent: 'conversational',
      intent: 'conversation',
      confidence: 0.5,
      originalInput: userInput,
      fallback: isFallback
    };
  }
}

async function openAISearchAgent(userInput, openai) {
  console.log('[OpenAI Search Agent] Fallback agent activated');
  console.log('[OpenAI Search Agent] Query:', userInput);
  
  // Use the conversational agent for fallback
  return await conversationalAgent(userInput, openai, true);
}

/**
 * Wraps an agent call with timeout
 * @param {Promise} agentPromise - The agent promise
 * @param {number} timeoutMs - Timeout in milliseconds
 * @returns {Promise} Promise that rejects on timeout
 */
function withTimeout(agentPromise, timeoutMs) {
  return Promise.race([
    agentPromise,
    new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Agent timeout')), timeoutMs)
    )
  ]);
}

async function routeAgent(userInput, openai, options = {}) {
  const { userId, pollInterval, maxWaitTime } = options;

  // ALWAYS start with conversational agent for fast response
  // This ensures users never wait - we give them an immediate conversational reply
  console.log('[Agent Router] Using conversational agent for immediate response');
  
  // For simple greetings, return immediately without any additional processing
  const simpleGreetings = /^(hi|hello|hey|greetings|good morning|good afternoon|good evening|thanks|thank you|bye|goodbye)$/i;
  const isSimpleGreeting = simpleGreetings.test(userInput.trim());
  
  if (isSimpleGreeting) {
    console.log('[Agent Router] Simple greeting detected, fast conversational response only');
    return await conversationalAgent(userInput, openai, false);
  }

  // For all other messages, get conversational response immediately
  // The conversational agent will handle everything conversationally
  // This ensures users always get a fast response without waiting
  return await conversationalAgent(userInput, openai, false);
}

/**
 * Analyzes user input to determine intent and select appropriate agent
 */
async function analyzeUserIntent(userInput, agentCapabilities, openai) {
  const agentList = Object.entries(agentCapabilities).map(([key, agent]) => ({
    key,
    name: agent.name,
    description: agent.description,
    keywords: agent.keywords || []
  }));

  const prompt = `Analyze the following user request and determine which agent should handle it.

Available Agents:
${agentList.map(a => `- ${a.key}: ${a.description} (Keywords: ${a.keywords.join(', ')})`).join('\n')}

User Request: "${userInput}"

Respond with a JSON object containing:
{
  "agent": "agent_key",
  "intent": "brief description of what the user wants",
  "confidence": 0.0-1.0,
  "reasoning": "why this agent was selected"
}

Agent keys: ${Object.keys(agentCapabilities).join(', ')}

Only respond with valid JSON, no other text.`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'You are an intelligent agent router. Analyze user requests and select the most appropriate agent. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const analysis = JSON.parse(response.choices[0].message.content);
    
    // Validate agent key exists
    if (!agentCapabilities[analysis.agent]) {
      // Default to searchBooking if invalid
      analysis.agent = 'searchBooking';
      analysis.confidence = 0.5;
    }

    return analysis;
  } catch (error) {
    console.error('Error analyzing intent:', error);
    // Fallback to general search booking
    return {
      agent: 'searchBooking',
      intent: 'general task',
      confidence: 0.5,
      reasoning: 'Fallback due to analysis error'
    };
  }
}

/**
 * Extracts product name and retailers from user input for price comparison
 */
async function extractPriceComparisonParams(userInput, openai) {
  const prompt = `Extract product name and retailers from this request: "${userInput}"

Respond with JSON:
{
  "product": "product name",
  "retailers": ["retailer1.com", "retailer2.com", ...]
}

If retailers are not specified, use common ones: ["amazon.com", "bestbuy.com", "target.com", "walmart.com"]`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'Extract product and retailer information. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const extracted = JSON.parse(response.choices[0].message.content);
    
    return {
      product: extracted.product || userInput,
      retailers: extracted.retailers || ['amazon.com', 'bestbuy.com', 'target.com']
    };
  } catch (error) {
    console.error('Error extracting price comparison params:', error);
    return {
      product: userInput,
      retailers: ['amazon.com', 'bestbuy.com', 'target.com']
    };
  }
}

/**
 * Extracts product name from user input
 */
async function extractProductName(userInput, openai) {
  const prompt = `Extract the product name from this request: "${userInput}"

Respond with JSON:
{
  "productName": "extracted product name"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'Extract product name. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const extracted = JSON.parse(response.choices[0].message.content);
    return extracted.productName || userInput;
  } catch (error) {
    console.error('Error extracting product name:', error);
    return userInput;
  }
}

/**
 * Extracts appointment parameters from user input
 */
async function extractAppointmentParams(userInput, openai) {
  const prompt = `Extract appointment details from this request: "${userInput}"

Respond with JSON:
{
  "appointmentType": "dentist|doctor|haircut|etc",
  "preferences": {
    "date": "preferred date or null",
    "time": "preferred time or null",
    "location": "preferred location or null"
  }
}`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: 'Extract appointment parameters. Always respond with valid JSON only.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' }
    });

    const extracted = JSON.parse(response.choices[0].message.content);
    return {
      appointmentType: extracted.appointmentType || 'appointment',
      preferences: extracted.preferences || {}
    };
  } catch (error) {
    console.error('Error extracting appointment params:', error);
    return {
      appointmentType: 'appointment',
      preferences: {}
    };
  }
}

module.exports = {
  routeAgent,
  analyzeUserIntent,
  extractPriceComparisonParams,
  extractProductName,
  extractAppointmentParams,
  conversationalAgent
};

