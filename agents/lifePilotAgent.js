const scheduleDentist = require("../tools/scheduleDentist");
const cancelSubscription = require("../tools/cancelSubscription");
const disputeCharge = require("../tools/disputeCharge");

async function runLifePilotAgent(input, openai) {
  console.log("LifePilot agent received input:", input);

  const tools = [
    {
      type: "function",
      function: {
        name: "schedule_dentist_appointment",
        description:
          "Schedule a dentist appointment based on user preferences and availability",
        parameters: {
          type: "object",
          properties: {
            preferredDate: {
              type: "string",
              description:
                'Preferred date for the appointment (e.g., "next Tuesday", "2025-11-25")',
            },
            preferredTime: {
              type: "string",
              description:
                'Preferred time of day (e.g., "morning", "afternoon", "evening")',
            },
            reason: {
              type: "string",
              description:
                'Reason for the appointment (e.g., "checkup", "cleaning", "toothache")',
            },
          },
          required: ["reason"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "cancel_subscription",
        description: "Cancel a subscription service",
        parameters: {
          type: "object",
          properties: {
            subscriptionName: {
              type: "string",
              description: "Name of the subscription to cancel",
            },
            reason: {
              type: "string",
              description: "Reason for cancellation",
            },
          },
          required: ["subscriptionName"],
        },
      },
    },
    {
      type: "function",
      function: {
        name: "dispute_credit_card_charge",
        description: "Dispute a fraudulent or incorrect credit card charge",
        parameters: {
          type: "object",
          properties: {
            transactionId: {
              type: "string",
              description: "Transaction ID or merchant name",
            },
            amount: {
              type: "number",
              description: "Amount to dispute",
            },
            reason: {
              type: "string",
              description:
                'Reason for dispute (e.g., "unauthorized charge", "never received item", "duplicate charge")',
            },
          },
          required: ["transactionId", "amount", "reason"],
        },
      },
    },
  ];

  try {
    // First, determine what action to take
    const response = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content:
            "You are LifePilot, an AI life admin assistant. Help users with scheduling appointments, canceling subscriptions, and disputing charges. Use the provided functions to take action.",
        },
        {
          role: "user",
          content: input,
        },
      ],
      tools: tools,
      tool_choice: "auto",
    });

    const message = response.choices[0].message;

    // If no function call, return a conversational response
    if (!message.tool_calls || message.tool_calls.length === 0) {
      return {
        action: "conversation",
        summary: message.content,
        details: { input },
      };
    }

    // Execute the function call
    const toolCall = message.tool_calls[0];
    const functionName = toolCall.function.name;
    const functionArgs = JSON.parse(toolCall.function.arguments);

    let result;

    switch (functionName) {
      case "schedule_dentist_appointment":
        // Pass both structured args and original input so location can be extracted
        result = await scheduleDentist(input, openai);
        break;
      case "cancel_subscription":
        result = await cancelSubscription(functionArgs, openai);
        break;
      case "dispute_credit_card_charge":
        result = await disputeCharge(functionArgs, openai);
        break;
      default:
        throw new Error(`Unknown function: ${functionName}`);
    }

    // Generate a user-friendly summary
    const summaryResponse = await openai.chat.completions.create({
      model: "gpt-4-turbo-preview",
      messages: [
        {
          role: "system",
          content:
            "Summarize the result of the action in a friendly, conversational way.",
        },
        {
          role: "user",
          content: `Action: ${functionName}\nResult: ${JSON.stringify(result)}`,
        },
      ],
    });

    return {
      action: functionName,
      summary: summaryResponse.choices[0].message.content,
      details: result,
      originalInput: input,
    };
  } catch (error) {
    console.error("Error in LifePilot agent:", error);
    throw error;
  }
}

module.exports = runLifePilotAgent;
