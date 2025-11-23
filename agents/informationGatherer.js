const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4-turbo-preview';

/**
 * Converts relative date strings to actual date strings (YYYY-MM-DD format)
 * @param {string} dateString - Relative date like "tonight", "today", "tomorrow", etc.
 * @returns {string} Actual date string in YYYY-MM-DD format
 */
function convertRelativeDate(dateString) {
  if (!dateString) return null;
  
  const lowerDate = dateString.toLowerCase().trim();
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  // Format date as YYYY-MM-DD
  const formatDate = (date) => {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };
  
  if (lowerDate.includes('tonight') || lowerDate.includes('today') || lowerDate === 'now') {
    return formatDate(today);
  }
  
  if (lowerDate.includes('tomorrow')) {
    return formatDate(tomorrow);
  }
  
  // If it's already in YYYY-MM-DD format, return as is
  if (/^\d{4}-\d{2}-\d{2}$/.test(dateString)) {
    return dateString;
  }
  
  // Return null if we can't determine the date
  return null;
}

/**
 * Information Gatherer - Collects required information before routing to AGI agents
 * @param {string} userInput - User's input
 * @param {Array} conversationHistory - Previous messages in the conversation
 * @param {Object} openai - OpenAI client instance
 * @returns {Promise<Object>} Either a question to ask or complete information ready for AGI
 */
async function gatherInformation(userInput, conversationHistory = [], openai) {
  console.log('[Information Gatherer] Processing input:', userInput);
  console.log('[Information Gatherer] Conversation history length:', conversationHistory.length);


  // Count how many questions have been asked in this conversation
  const questionsAsked = conversationHistory.filter(
    msg => msg.role === 'assistant' && 
    (msg.content.includes('?') || msg.content.toLowerCase().includes('what') || 
     msg.content.toLowerCase().includes('when') || msg.content.toLowerCase().includes('where') ||
     msg.content.toLowerCase().includes('which') || msg.content.toLowerCase().includes('how'))
  ).length;

  console.log('[Information Gatherer] Questions already asked:', questionsAsked);

  // Analyze what task the user wants and what information we have
  const analysisPrompt = `You are an ultra-efficient information-gathering agent. Your goal is to collect ONLY the minimum required information to execute the user's task.

ABSOLUTE RULES:
- TOTAL questions allowed per task: **maximum 2**
- Ask ONLY if the task cannot proceed without that specific detail
- If a missing detail can be reasonably inferred, assumed, approximated, defaulted, or selected from the most common option — DO NOT ask
- Never repeat questions already answered
- Never ask for confirmations ("Is this correct?")
- Never ask broad or multi-part questions
- Never create unnecessary back-and-forth

DATE HANDLING (CRITICAL):
- When users say "tonight", "today", "tomorrow", "this week", "next week", etc., DO NOT ask them to provide a specific date
- Automatically convert relative dates to actual date strings (YYYY-MM-DD format):
  * "tonight" or "today" → use today's date (YYYY-MM-DD format)
  * "tomorrow" → use tomorrow's date (YYYY-MM-DD format)
  * "this week" → use today's date
  * "next week" → calculate next week's date
- Extract relative dates from the conversation and convert them to actual dates in the collectedInfo.date field
- Only ask for date clarification if the user's request is ambiguous (e.g., "sometime next month" without specifics)

Your job during analysis:
1. Identify the user's task (bookAppointment, cancelSubscription, comparePrices, researchProduct, other)
2. Identify what information we already have from the conversation
3. If date information contains relative terms like "tonight", "today", "tomorrow", automatically convert to actual date (YYYY-MM-DD format) in collectedInfo.date
4. Identify ONLY the critical missing info required to proceed
5. Count how many questions have already been asked (check conversationHistory for assistant messages with questions)
6. Decide whether we should:
   - Proceed without asking anything (if we can infer/assume defaults)
   - Ask 1 single essential question (if we have asked fewer than 2 questions)
   - Stop asking further questions because the 2-question limit is reached (mark readyForAGI: true)

If the 2-question limit is reached:
- Mark the task as "readyForAGI": true
- Fill missing fields with null, best guess, or placeholder
- DO NOT ask any more questions

User's current input: "${userInput}"

Previous conversation:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n') || 'No previous conversation'}

Questions already asked in this conversation: ${questionsAsked}

Respond with JSON:
{
  "taskType": "bookAppointment|cancelSubscription|comparePrices|researchProduct|other",
  "collectedInfo": {
    "appointmentType": "value or null",
    "date": "value or null",
    "time": "value or null",
    "location": "value or null",
    "subscriptionName": "value or null",
    "loginDetails": "value or null",
    "product": "value or null",
    "retailers": ["value or null"],
    "purpose": "value or null",
    "timeline": "value or null",
    "priority": "value or null",
    "productName": "value or null"
  },
  "missingFields": ["field1", "field2"],
  "readyForAGI": true or false,
  "questionsAsked": ${questionsAsked},
  "canProceedWithoutAsking": true or false,
  "nextQuestion": "question to ask user or null if ready"
}`;

  try {
    const response = await openai.chat.completions.create({
      model: OPENAI_MODEL,
      messages: [
        {
          role: 'system',
          content: `You are an ultra-efficient information-gathering agent. Your goal is to collect ONLY the minimum required information to execute the user's task.

ABSOLUTE RULES:
- TOTAL questions allowed per task: **maximum 2**
- Ask ONLY if the task cannot proceed without that specific detail
- If a missing detail can be reasonably inferred, assumed, approximated, defaulted, or selected from the most common option — DO NOT ask
- Never repeat questions already answered
- Never ask for confirmations ("Is this correct?")
- Never ask broad or multi-part questions
- Never create unnecessary back-and-forth

Always respond with valid JSON only.`
        },
        {
          role: 'user',
          content: analysisPrompt
        }
      ],
      temperature: 0.3,
      response_format: { type: 'json_object' },
      max_completion_tokens: 500
    });

    const analysis = JSON.parse(response.choices[0].message.content);
    
    console.log('[Information Gatherer] Analysis result:', analysis);

    // Convert relative dates to actual dates
    if (analysis.collectedInfo && analysis.collectedInfo.date) {
      const convertedDate = convertRelativeDate(analysis.collectedInfo.date);
      if (convertedDate) {
        console.log('[Information Gatherer] Converted relative date:', analysis.collectedInfo.date, '→', convertedDate);
        analysis.collectedInfo.date = convertedDate;
      }
    }

    // Check if we've reached the 2-question limit
    const hasReachedLimit = questionsAsked >= 2;
    
    // If we've reached the limit or can proceed without asking, mark as ready
    if (hasReachedLimit || analysis.canProceedWithoutAsking || (analysis.readyForAGI && analysis.taskType !== 'other')) {
      console.log('[Information Gatherer] Proceeding without asking:', {
        hasReachedLimit,
        canProceedWithoutAsking: analysis.canProceedWithoutAsking,
        readyForAGI: analysis.readyForAGI
      });
      return {
        ready: true,
        taskType: analysis.taskType,
        collectedInfo: analysis.collectedInfo,
        message: hasReachedLimit 
          ? 'Question limit reached, proceeding with available information'
          : 'All information collected, ready to proceed'
      };
    }

    // If information is missing and we haven't reached the limit, generate a conversational question
    if (analysis.missingFields && analysis.missingFields.length > 0 && !hasReachedLimit) {
      const questionPrompt = `The user wants to ${analysis.taskType}. 
We still need: ${analysis.missingFields.join(', ')}.

Current conversation:
${conversationHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n') || 'No previous conversation'}
User's latest input: "${userInput}"

Questions already asked: ${questionsAsked} (limit: 2)

CRITICAL RULES:
- Ask ONLY ONE single, specific question
- Ask for the MOST CRITICAL missing piece of information that prevents task execution
- Be direct and concise - no fluff
- Never ask for multiple things
- Never ask for confirmations
- If this would be question #${questionsAsked + 1} and it's not absolutely essential, mark readyForAGI: true instead

Generate a friendly, conversational question to ask the user for the missing information.
If the missing information is not critical or can be inferred, respond with readyForAGI: true instead.

Respond with JSON:
{
  "question": "your friendly question here or null if ready to proceed",
  "missingField": "the field you're asking about or null",
  "readyForAGI": true if we should proceed without asking, false otherwise
}`;

      const questionResponse = await openai.chat.completions.create({
        model: OPENAI_MODEL,
        messages: [
          {
            role: 'system',
            content: `You are an ultra-efficient information-gathering agent. Your goal is to ask ONLY the minimum required questions.

ABSOLUTE RULES:
- Ask ONLY ONE single, specific question
- Ask for the MOST CRITICAL missing piece of information that prevents task execution
- Be direct and concise - no fluff
- Never ask for multiple things
- Never ask for confirmations
- If the missing information is not critical or can be inferred, mark readyForAGI: true instead of asking

Always respond with valid JSON only.`
          },
          {
            role: 'user',
            content: questionPrompt
          }
        ],
        temperature: 0.7,
        response_format: { type: 'json_object' },
        max_completion_tokens: 200
      });

      const questionData = JSON.parse(questionResponse.choices[0].message.content);

      // Convert relative dates before processing
      if (analysis.collectedInfo && analysis.collectedInfo.date) {
        const convertedDate = convertRelativeDate(analysis.collectedInfo.date);
        if (convertedDate) {
          analysis.collectedInfo.date = convertedDate;
        }
      }

      // If the question generator says we're ready, proceed without asking
      if (questionData.readyForAGI || !questionData.question) {
        console.log('[Information Gatherer] Question generator determined we can proceed without asking');
        return {
          ready: true,
          taskType: analysis.taskType,
          collectedInfo: analysis.collectedInfo,
          message: 'Proceeding with available information'
        };
      }

      return {
        ready: false,
        taskType: analysis.taskType,
        question: questionData.question,
        missingField: questionData.missingField,
        collectedInfo: analysis.collectedInfo,
        missingFields: analysis.missingFields,
        questionsAsked: questionsAsked + 1
      };
    }

    // If task type is 'other', use conversational agent
    return {
      ready: false,
      taskType: 'other',
      question: null,
      useConversational: true
    };

  } catch (error) {
    console.error('[Information Gatherer] Error:', error);
    return {
      ready: false,
      taskType: 'other',
      question: null,
      useConversational: true,
      error: error.message
    };
  }
}

/**
 * Formats collected information into a prompt for AGI agent
 * @param {string} taskType - Type of task
 * @param {Object} collectedInfo - Collected information
 * @returns {string} Formatted prompt for AGI agent
 */
function formatAGIPrompt(taskType, collectedInfo) {
  switch (taskType) {
    case 'bookAppointment':
      return `Book a ${collectedInfo.appointmentType || 'appointment'} appointment${collectedInfo.date ? ` for ${collectedInfo.date}` : ''}${collectedInfo.time ? ` at ${collectedInfo.time}` : ''}${collectedInfo.location ? ` near ${collectedInfo.location}` : ''}`;
    
    case 'cancelSubscription':
      return `Cancel my ${collectedInfo.subscriptionName} subscription.${collectedInfo.loginDetails ? ` Login details: ${collectedInfo.loginDetails}` : ''}`;
    
    case 'comparePrices':
      return `Compare prices for ${collectedInfo.product}${collectedInfo.purpose ? ` for ${collectedInfo.purpose}` : ''}${collectedInfo.timeline ? ` needed by ${collectedInfo.timeline}` : ''}. Priority: ${collectedInfo.priority || 'best value'}.${collectedInfo.retailers && collectedInfo.retailers.length > 0 ? ` Check these retailers: ${collectedInfo.retailers.join(', ')}` : ''}`;
    
    case 'researchProduct':
      return `Research ${collectedInfo.productName} - provide specifications, prices across retailers, reviews, and availability`;
    
    default:
      return '';
  }
}

module.exports = {
  gatherInformation,
  formatAGIPrompt
};

