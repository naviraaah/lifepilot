const runLifePilotAgent = require("./lifePilotAgent");
const {
  runSearchBookingAgent,
  searchBestOptions,
  bookAppointment,
  checkPrices,
  researchProduct,
} = require("./searchBookingAgent");
const scheduleDentist = require("../tools/scheduleDentist");
const cancelSubscription = require("../tools/cancelSubscription");
const disputeCharge = require("../tools/disputeCharge");
const { gatherInformation, formatAGIPrompt } = require("./informationGatherer");

/**
 * Agent Router - Analyzes user input and routes to appropriate agent
 * @param {string} userInput - User's natural language input
 * @param {Object} openai - OpenAI client instance
 * @param {Object} options - Additional options
 * @returns {Promise<Object>} Agent execution result
 */

const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4-turbo-preview";
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
async function conversationalAgent(userInput, openai, isFallback = false, conversationHistory = []) {
  console.log("[Conversational Agent] Processing query:", userInput);
  console.log("[Conversational Agent] Conversation history length:", conversationHistory.length);
  if (conversationHistory.length > 0) {
    console.log("[Conversational Agent] Conversation history:", JSON.stringify(conversationHistory, null, 2));
  }

  try {
    // Increased timeout to 20 seconds to allow OpenAI API to respond
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Conversational agent timeout")), 20000)
    );

    // Build conversation context - normalize roles to 'user' or 'assistant'
    const conversationMessages = conversationHistory.length > 0
      ? conversationHistory
          .filter(msg => msg && msg.content && msg.role) // Filter out invalid messages
          .map(msg => ({
            role: msg.role === 'user' ? 'user' : 'assistant', // Normalize role
            content: String(msg.content).trim() // Ensure content is a string
          }))
          .filter(msg => msg.content.length > 0) // Remove empty messages
      : [];
    
    console.log("[Conversational Agent] Processed conversation messages:", conversationMessages.length);

    const apiPromise = openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content: `You are LifePilot, an AI assistant that helps manage life's boring tasks. You're friendly, conversational, and helpful.

IMPORTANT RULES:
- NEVER provide wrong information or make assumptions about missing details
- ALWAYS ask for required information before proceeding with tasks
- Ask ONE question at a time in a natural, conversational way
- Be friendly and helpful, but don't proceed until you have all necessary information

Your capabilities include:
- Having natural conversations and answering questions
- Scheduling appointments (dentist, doctor, haircut, etc.)
- Managing subscriptions and cancellations
- Handling disputes and charges
- Comparing prices and researching products
- Finding restaurants, booking services, and more

When users want to book appointments:
- Ask: "When would you like me to book this appointment?"
- Then ask: "What time would you like this appointment?"
- Then ask: "What location are you looking for this appointment in?"
- Only proceed once you have all three answers

When users want to cancel subscriptions:
- Ask: "Which subscription would you like to cancel?"
- Then ask: "I'll need your login details for that subscription. Please provide your email/username and password."
- Only proceed once you have both pieces of information

When users want to compare prices:
- Ask: "What would you like me to compare prices for?"
- Ask: "What is this for? (shopping, travel, etc.)"
- Ask: "When do you need this?"
- Ask: "What's most important to you - price, timing, or quality?"
- Only proceed once you understand what they need

When users greet you (hi, hello, hey):
- Respond warmly and naturally
- Keep it brief and friendly (1-2 sentences)
- Ask how you can help

When users ask questions:
- Answer directly and conversationally
- Be helpful and clear
- Keep responses concise but complete

CRITICAL: If you don't have all required information, ask for it. Never guess or assume. Always ask questions to gather complete information before taking action.`,
        },
        ...conversationMessages,
        {
          role: "user",
          content: userInput,
        },
      ],
      temperature: 0.7,
      max_completion_tokens: 300,
      stream: false,
    });

    const response = await Promise.race([apiPromise, timeoutPromise]);

    if (
      !response ||
      !response.choices ||
      !response.choices[0] ||
      !response.choices[0].message
    ) {
      throw new Error("Invalid response from OpenAI API");
    }

    const content = response.choices[0].message.content;

    if (!content) {
      throw new Error("Empty response from OpenAI API");
    }

    return {
      action: "conversation",
      status: "completed",
      summary: content,
      details: {
        response: content,
        type: "conversational",
        conversational: true,
      },
      routedAgent: "conversational",
      intent: "conversation",
      confidence: 0.9,
      originalInput: userInput,
      fallback: isFallback,
    };
  } catch (error) {
    console.error("[Conversational Agent] Error:", error);
    console.error("[Conversational Agent] Error details:", {
      message: error.message,
      code: error.code,
      status: error.status,
      response: error.response?.data,
    });

    // Provide a helpful error message
    let errorMessage =
      "I'm having trouble connecting right now. Please try again in a moment!";

    // Handle specific error types
    if (error.status === 400) {
      // Bad request - usually parameter issues
      if (
        (error.message && error.message.includes("max_tokens")) ||
        error.message.includes("max_completion_tokens")
      ) {
        errorMessage =
          "There's a configuration issue with the AI model. Please contact support.";
      } else if (error.message && error.message.includes("model")) {
        errorMessage =
          "The AI model configuration is invalid. Please check your settings.";
      } else {
        errorMessage = "There was an issue with the request. Please try again.";
      }
    } else if (error.message && error.message.includes("timeout")) {
      errorMessage =
        "The request is taking longer than expected. Please try again!";
    } else if (
      error.message &&
      (error.message.includes("API key") || error.status === 401)
    ) {
      errorMessage =
        "There's an issue with the API configuration. Please check your OpenAI API key.";
    } else if (error.status === 429) {
      errorMessage =
        "I'm receiving too many requests right now. Please wait a moment and try again.";
    } else if (error.status === 500 || error.status >= 500) {
      errorMessage = "There's a server error. Please try again in a moment.";
    } else if (error.code === "ECONNREFUSED" || error.code === "ENOTFOUND") {
      errorMessage =
        "Unable to connect to the AI service. Please check your internet connection.";
    }

    // Return error response that frontend can handle
    return {
      action: "conversation",
      status: "error",
      summary: errorMessage,
      details: {
        error: error.message,
        type: "conversational",
        conversational: true,
      },
      routedAgent: "conversational",
      intent: "conversation",
      confidence: 0.5,
      originalInput: userInput,
      fallback: isFallback,
    };
  }
}

async function openAISearchAgent(userInput, openai, conversationHistory = []) {
  console.log("[OpenAI Search Agent] Fallback agent activated");
  console.log("[OpenAI Search Agent] Query:", userInput);

  // Use the conversational agent for fallback
  return await conversationalAgent(userInput, openai, true, conversationHistory);
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
      setTimeout(() => reject(new Error("Agent timeout")), timeoutMs)
    ),
  ]);
}

async function routeAgent(userInput, openai, options = {}) {
  const { userId, pollInterval, maxWaitTime, conversationHistory = [] } = options;

  // For simple greetings, return immediately without any additional processing
  const simpleGreetings =
    /^(hi|hello|hey|greetings|good morning|good afternoon|good evening|thanks|thank you|bye|goodbye)$/i;
  const isSimpleGreeting = simpleGreetings.test(userInput.trim());

  if (isSimpleGreeting) {
    console.log(
      "[Agent Router] Simple greeting detected, fast conversational response only"
    );
    return await conversationalAgent(userInput, openai, false, conversationHistory);
  }

  // Define agent capabilities for intent-based routing
  const agentCapabilities = {
    dentist: {
      name: "Dentist Appointment Agent",
      description:
        "Handles dentist appointment scheduling, booking, and management",
      keywords: [
        "dentist",
        "dental",
        "appointment",
        "schedule",
        "teeth",
        "tooth",
        "cleaning",
        "checkup",
        "oral",
      ],
    },
    subscription: {
      name: "Subscription Management Agent",
      description: "Handles subscription cancellations and management",
      keywords: [
        "cancel",
        "subscription",
        "membership",
        "renewal",
        "unsubscribe",
      ],
    },
    dispute: {
      name: "Charge Dispute Agent",
      description: "Handles credit card charge disputes and fraud claims",
      keywords: [
        "dispute",
        "charge",
        "fraud",
        "unauthorized",
        "refund",
        "transaction",
      ],
    },
    searchBooking: {
      name: "Search and Booking Agent",
      description:
        "Handles general search, price comparison, product research, and booking tasks. ALWAYS use AGI agents for these tasks.",
      keywords: [
        "search",
        "find",
        "look for",
        "compare",
        "price",
        "prices",
        "cheapest",
        "best price",
        "book",
        "booking",
        "schedule",
        "appointment",
        "reserve",
        "research",
        "product",
        "restaurant",
        "haircut",
        "hotel",
        "flight",
        "service",
        "compare prices",
        "price comparison",
        "product research",
        "book appointment",
        "schedule appointment",
        "make appointment",
      ],
    },
    conversational: {
      name: "Conversational Agent",
      description: "Handles general conversation, questions, and chat",
      keywords: [
        "question",
        "help",
        "what",
        "how",
        "why",
        "explain",
        "tell me",
      ],
    },
  };

  // Analyze user intent to determine which agent to use
  try {
    console.log("[Agent Router] Analyzing user intent...");
    const intentAnalysis = await analyzeUserIntent(
      userInput,
      agentCapabilities,
      openai
    );

    console.log(`[Agent Router] Intent analysis:`, {
      agent: intentAnalysis.agent,
      intent: intentAnalysis.intent,
      confidence: intentAnalysis.confidence,
    });

    // Route to appropriate agent based on intent
    switch (intentAnalysis.agent) {
      case "dentist":
        console.log(
          "[Agent Router] Routing to LifePilot agent for dentist appointment"
        );
        return await runLifePilotAgent(userInput, openai);

      case "subscription":
        console.log("[Agent Router] Checking information for subscription cancellation");
        
        // Check if we have all required information
        const subInfoCheck = await gatherInformation(userInput, conversationHistory, openai);
        
        if (!subInfoCheck.ready) {
          // Information is missing - ask questions conversationally
          if (subInfoCheck.question) {
            console.log("[Agent Router] ⚠️ Missing information, asking question:", subInfoCheck.question);
            return {
              action: "information_gathering",
              status: "needs_info",
              summary: subInfoCheck.question,
              details: {
                taskType: subInfoCheck.taskType,
                missingFields: subInfoCheck.missingFields,
                collectedInfo: subInfoCheck.collectedInfo,
                question: subInfoCheck.question
              },
              routedAgent: "conversational",
              intent: "gathering_information",
              confidence: 0.8,
              originalInput: userInput,
              needsMoreInfo: true
            };
          } else {
            // Use conversational agent to ask questions
            return await conversationalAgent(userInput, openai, false, conversationHistory);
          }
        }
        
        // All information collected - format prompt and route to LifePilot agent
        console.log("[Agent Router] ✅ All information collected, routing to LifePilot agent");
        const subPrompt = formatAGIPrompt(subInfoCheck.taskType, subInfoCheck.collectedInfo);
        console.log("[Agent Router] Formatted prompt:", subPrompt);
        return await runLifePilotAgent(subPrompt, openai);

      case "dispute":
        console.log(
          "[Agent Router] Routing to LifePilot agent for charge dispute"
        );
        return await runLifePilotAgent(userInput, openai);

      case "searchBooking":
        console.log("[Agent Router] 🔵 Checking information for search/booking task");
        
        // First, check if we have all required information
        const infoCheck = await gatherInformation(userInput, conversationHistory, openai);
        
        if (!infoCheck.ready) {
          // Information is missing - ask questions conversationally
          if (infoCheck.question) {
            console.log("[Agent Router] ⚠️ Missing information, asking question:", infoCheck.question);
            return {
              action: "information_gathering",
              status: "needs_info",
              summary: infoCheck.question,
              details: {
                taskType: infoCheck.taskType,
                missingFields: infoCheck.missingFields,
                collectedInfo: infoCheck.collectedInfo,
                question: infoCheck.question
              },
              routedAgent: "conversational",
              intent: "gathering_information",
              confidence: 0.8,
              originalInput: userInput,
              needsMoreInfo: true
            };
          } else {
            // Use conversational agent to ask questions
            return await conversationalAgent(userInput, openai, false, conversationHistory);
          }
        }
        
        // All information collected - format prompt and route to AGI agent
        console.log("[Agent Router] ✅ All information collected, routing to AGI agent");
        const agiPrompt = formatAGIPrompt(infoCheck.taskType, infoCheck.collectedInfo);
        console.log("[Agent Router] Formatted AGI prompt:", agiPrompt);
        
        const agiOptions = {
          ...options,
          pollInterval: options.pollInterval || 5000,
          maxWaitTime: options.maxWaitTime || 600000, // 10 minutes for complex tasks
        };
        
        try {
          // Route to appropriate AGI agent based on task type
          let result;
          if (infoCheck.taskType === 'bookAppointment') {
            const { appointmentType, date, time, location } = infoCheck.collectedInfo;
            result = await bookAppointment(
              appointmentType || 'appointment',
              { date, time, location },
              agiOptions
            );
          } else if (infoCheck.taskType === 'comparePrices') {
            const { product, retailers, purpose, timeline, priority } = infoCheck.collectedInfo;
            // Extract retailers from collected info or use defaults
            const retailerList = retailers && retailers.length > 0 
              ? retailers 
              : ['amazon.com', 'bestbuy.com', 'target.com', 'walmart.com'];
            result = await checkPrices(product, retailerList, agiOptions);
          } else if (infoCheck.taskType === 'researchProduct') {
            result = await researchProduct(infoCheck.collectedInfo.productName, agiOptions);
          } else {
            // General search/booking
            result = await runSearchBookingAgent(agiPrompt, agiOptions);
          }
          
          console.log("[Agent Router] ✅ AGI agent completed successfully");
          return {
            ...result,
            routedAgent: "searchBooking",
            agiAgent: true,
            fallback: false,
            taskType: infoCheck.taskType
          };
        } catch (error) {
          console.error("[Agent Router] ❌ AGI agent error:", error);
          throw error;
        }

      case "conversational":
      default:
        console.log("[Agent Router] Routing to conversational agent");
        return await conversationalAgent(userInput, openai, false, conversationHistory);
    }
  } catch (error) {
    console.error(
      "[Agent Router] Error in intent analysis:",
      error
    );
    
    // Check if the query looks like a search or booking request
    const searchBookingPatterns = [
      /\b(search|find|look for|compare|price|book|booking|schedule|appointment|reserve|research|product)\b/i,
      /\b(restaurant|hotel|flight|haircut|dentist|doctor|service)\b/i,
    ];
    
    const isSearchOrBooking = searchBookingPatterns.some(pattern => pattern.test(userInput));
    
    if (isSearchOrBooking) {
      console.log("[Agent Router] 🔵 Detected search/booking pattern, routing to AGI agent despite intent analysis error");
      // Route to AGI agent even if intent analysis failed
      const agiOptions = {
        ...options,
        pollInterval: options.pollInterval || 5000,
        maxWaitTime: options.maxWaitTime || 600000,
      };
      // Check information before routing
      const infoCheck = await gatherInformation(userInput, conversationHistory, openai);
      
      if (!infoCheck.ready && infoCheck.question) {
        return {
          action: "information_gathering",
          status: "needs_info",
          summary: infoCheck.question,
          details: {
            taskType: infoCheck.taskType,
            missingFields: infoCheck.missingFields,
            collectedInfo: infoCheck.collectedInfo,
            question: infoCheck.question
          },
          routedAgent: "conversational",
          intent: "gathering_information",
          confidence: 0.8,
          originalInput: userInput,
          needsMoreInfo: true,
          intentAnalysisError: error.message
        };
      }
      
      try {
        const agiPrompt = infoCheck.ready 
          ? formatAGIPrompt(infoCheck.taskType, infoCheck.collectedInfo)
          : userInput;
        const result = await runSearchBookingAgent(agiPrompt, agiOptions);
        return {
          ...result,
          routedAgent: "searchBooking",
          agiAgent: true,
          fallback: false,
          intentAnalysisError: error.message
        };
      } catch (agiError) {
        // Even if AGI fails, don't fallback to OpenAI - throw the error
        console.error("[Agent Router] ❌ AGI agent error, not falling back to OpenAI:", agiError);
        throw agiError;
      }
    }
    
    // Only fallback to conversational agent for non-search/booking queries
    console.log("[Agent Router] Falling back to conversational agent");
    return await conversationalAgent(userInput, openai, false, conversationHistory);
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
    keywords: agent.keywords || [],
  }));

  const prompt = `Analyze the following user request and determine which agent should handle it.

Available Agents:
${agentList
  .map(
    (a) => `- ${a.key}: ${a.description} (Keywords: ${a.keywords.join(", ")})`
  )
  .join("\n")}

IMPORTANT ROUTING RULES:
- If the user wants to SEARCH, FIND, COMPARE PRICES, RESEARCH PRODUCTS, or BOOK/SCHEDULE appointments (restaurants, hotels, services, haircuts, etc.), ALWAYS route to "searchBooking" agent
- The "searchBooking" agent uses AGI agents and should be used for ALL search and booking tasks
- Only use other agents for specific tasks: dentist appointments (dentist), subscription cancellation (subscription), charge disputes (dispute)

User Request: "${userInput}"

Respond with a JSON object containing:
{
  "agent": "agent_key",
  "intent": "brief description of what the user wants",
  "confidence": 0.0-1.0,
  "reasoning": "why this agent was selected"
}

Agent keys: ${Object.keys(agentCapabilities).join(", ")}

Only respond with valid JSON, no other text.`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: "system",
          content:
            "You are an intelligent agent router. Analyze user requests and select the most appropriate agent. Always respond with valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const analysis = JSON.parse(response.choices[0].message.content);

    // Validate agent key exists
    if (!agentCapabilities[analysis.agent]) {
      // Default to searchBooking if invalid
      analysis.agent = "searchBooking";
      analysis.confidence = 0.5;
    }

    return analysis;
  } catch (error) {
    console.error("Error analyzing intent:", error);
    // Fallback to general search booking
    return {
      agent: "searchBooking",
      intent: "general task",
      confidence: 0.5,
      reasoning: "Fallback due to analysis error",
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
          role: "system",
          content:
            "Extract product and retailer information. Always respond with valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const extracted = JSON.parse(response.choices[0].message.content);

    return {
      product: extracted.product || userInput,
      retailers: extracted.retailers || [
        "amazon.com",
        "bestbuy.com",
        "target.com",
      ],
    };
  } catch (error) {
    console.error("Error extracting price comparison params:", error);
    return {
      product: userInput,
      retailers: ["amazon.com", "bestbuy.com", "target.com"],
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
          role: "system",
          content: "Extract product name. Always respond with valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const extracted = JSON.parse(response.choices[0].message.content);
    return extracted.productName || userInput;
  } catch (error) {
    console.error("Error extracting product name:", error);
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
          role: "system",
          content:
            "Extract appointment parameters. Always respond with valid JSON only.",
        },
        {
          role: "user",
          content: prompt,
        },
      ],
      temperature: 0.3,
      response_format: { type: "json_object" },
    });

    const extracted = JSON.parse(response.choices[0].message.content);
    return {
      appointmentType: extracted.appointmentType || "appointment",
      preferences: extracted.preferences || {},
    };
  } catch (error) {
    console.error("Error extracting appointment params:", error);
    return {
      appointmentType: "appointment",
      preferences: {},
    };
  }
}

module.exports = {
  routeAgent,
  analyzeUserIntent,
  extractPriceComparisonParams,
  extractProductName,
  extractAppointmentParams,
  conversationalAgent,
};
