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

const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-5.1';
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || 'No-key';
const AGENT_TIMEOUT = 10000; // 10 seconds timeout for primary agents

/**
 * OpenAI-based search agent as fallback when primary agents timeout
 * @param {string} userInput - User's natural language input
 * @param {Object} openai - OpenAI client instance
 * @returns {Promise<Object>} Search result
 */


async function openAISearchAgent(userInput, openai) {
  console.log('[OpenAI Search Agent] Fallback agent activated');
  console.log('[OpenAI Search Agent] Query:', userInput);
  
  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL || 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are an intelligent search assistant. Help users find information, compare options, research products, book services, or answer questions. 
          
Provide comprehensive, accurate, and actionable responses. If the user is asking about:
- Products: Provide specifications, prices, reviews, and where to buy
- Services: Provide options, pricing, availability, and booking information
- Comparisons: Provide detailed comparisons with pros/cons
- General queries: Provide helpful, detailed answers

Format your response as JSON when possible, or provide clear structured text.`
        },
        {
          role: 'user',
          content: userInput
        }
      ],
      temperature: 0.7,
      max_completion_tokens: 2000
    });

    const content = response.choices[0].message.content;
    
    // Try to parse as JSON if possible
    let parsedContent = content;
    try {
      parsedContent = JSON.parse(content);
    } catch (e) {
      // Not JSON, keep as text
    }

    return {
      action: 'openai_search',
      status: 'completed',
      summary: content.substring(0, 200) + (content.length > 200 ? '...' : ''),
      details: parsedContent,
      routedAgent: 'openai_search',
      intent: 'general search/query',
      confidence: 0.8,
      originalInput: userInput,
      fallback: true,
      fallbackReason: 'Primary agent timeout'
    };
  } catch (error) {
    console.error('[OpenAI Search Agent] Error:', error);
    return {
      action: 'openai_search',
      status: 'error',
      summary: `Error: ${error.message}`,
      details: { error: error.message },
      routedAgent: 'openai_search',
      intent: 'general search/query',
      confidence: 0.5,
      originalInput: userInput,
      fallback: true,
      fallbackReason: 'Primary agent timeout'
    };
  }
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

  // Define available agents and their capabilities
  const agentCapabilities = {
    lifePilot: {
      name: 'lifePilot',
      description: 'Handles appointment scheduling, subscription management, and charge disputes',
      functions: ['schedule_dentist_appointment', 'cancel_subscription', 'dispute_credit_card_charge'],
      handler: runLifePilotAgent
    },
    priceComparison: {
      name: 'priceComparison',
      description: 'Compares prices across multiple retailers for a specific product',
      keywords: ['compare prices', 'price comparison', 'cheapest', 'best price', 'compare costs'],
      handler: async (input, opts) => {
        // Extract product and retailers from input using OpenAI
        const extraction = await extractPriceComparisonParams(input, openai);
        return await checkPrices(extraction.product, extraction.retailers, opts);
      }
    },
    productResearch: {
      name: 'productResearch',
      description: 'Researches product specifications, prices, reviews, and availability',
      keywords: ['research product', 'product info', 'specifications', 'reviews', 'product details'],
      handler: async (input, opts) => {
        const productName = await extractProductName(input, openai);
        return await researchProduct(productName, opts);
      }
    },
    bookAppointment: {
      name: 'bookAppointment',
      description: 'Books appointments for various services (dentist, doctor, haircut, etc.)',
      keywords: ['book appointment', 'schedule appointment', 'make appointment', 'reserve appointment'],
      handler: async (input, opts) => {
        const params = await extractAppointmentParams(input, openai);
        return await bookAppointment(params.appointmentType, params.preferences, opts);
      }
    },
    searchBooking: {
      name: 'searchBooking',
      description: 'General search and booking tasks (restaurants, hotels, events, etc.)',
      keywords: ['find restaurant', 'book hotel', 'search for', 'find best', 'recommend'],
      handler: runSearchBookingAgent
    },
    generalSearch: {
      name: 'generalSearch',
      description: 'General search for best options, services, or products',
      keywords: ['search', 'find', 'look for', 'best options', 'recommendations'],
      handler: searchBestOptions
    }
  };

  try {
    // Use OpenAI to analyze the user input and determine the best agent
    const analysis = await analyzeUserIntent(userInput, agentCapabilities, openai);
    
    console.log(`[Agent Router] Intent: ${analysis.intent}, Confidence: ${analysis.confidence}, Agent: ${analysis.agent}`);
    console.log(`[Agent Router] Setting ${AGENT_TIMEOUT}ms timeout for primary agent`);

    const agentOptions = {};
    if (pollInterval) agentOptions.pollInterval = pollInterval;
    if (maxWaitTime) agentOptions.maxWaitTime = maxWaitTime;

    // Route to appropriate agent with timeout
    let result;
    const selectedAgent = agentCapabilities[analysis.agent];

    try {
      // Wrap agent call with timeout
      let agentPromise;
      
      if (!selectedAgent) {
        // Fallback to general search booking agent
        console.log('[Agent Router] No specific agent found, using general search');
        agentPromise = searchBestOptions(userInput, agentOptions);
      } else {
        // Use the selected agent's handler
        console.log(`[Agent Router] Attempting to use agent: ${analysis.agent}`);
        if (analysis.agent === 'lifePilot') {
          agentPromise = selectedAgent.handler(userInput, openai);
        } else {
          agentPromise = selectedAgent.handler(userInput, agentOptions);
        }
      }

      // Race between agent response and timeout
      result = await withTimeout(agentPromise, AGENT_TIMEOUT);
      
      console.log(`[Agent Router] Primary agent completed successfully`);
      
      return {
        ...result,
        routedAgent: analysis.agent,
        intent: analysis.intent,
        confidence: analysis.confidence,
        originalInput: userInput,
        fallback: false
      };

    } catch (timeoutError) {
      // Primary agent timed out or failed
      if (timeoutError.message === 'Agent timeout') {
        console.warn(`[Agent Router] ⏰ Primary agent timed out after ${AGENT_TIMEOUT}ms`);
        console.log(`[Agent Router] 🔄 Falling back to OpenAI search agent`);
      } else {
        console.error(`[Agent Router] ❌ Primary agent error: ${timeoutError.message}`);
        console.log(`[Agent Router] 🔄 Falling back to OpenAI search agent`);
      }

      // Fallback to OpenAI search agent
      const fallbackResult = await openAISearchAgent(userInput, openai);
      
      return {
        ...fallbackResult,
        originalRoutedAgent: analysis.agent,
        originalIntent: analysis.intent,
        originalConfidence: analysis.confidence,
        timeoutError: timeoutError.message
      };
    }

  } catch (error) {
    console.error('[Agent Router] Critical error:', error);
    
    // Last resort: try OpenAI search agent
    try {
      console.log('[Agent Router] 🔄 Attempting OpenAI search agent as last resort');
      const fallbackResult = await openAISearchAgent(userInput, openai);
      return {
        ...fallbackResult,
        criticalError: error.message
      };
    } catch (fallbackError) {
      // If even fallback fails, throw the original error
      throw error;
    }
  }
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
      model: OPENAI_MODEL || 'gpt-5.1',
      apiKey: OPENAI_API_KEY || 'No-key',
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
      model: OPENAI_MODEL || 'gpt-5.1',
      apiKey: OPENAI_API_KEY || 'No-key',
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
      model: OPENAI_MODEL || 'gpt-5.1',
      apiKey: OPENAI_API_KEY || 'No-key',
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
      model: OPENAI_MODEL || 'gpt-5.1',
      apiKey: OPENAI_API_KEY || 'No-key',
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
  extractAppointmentParams
};

