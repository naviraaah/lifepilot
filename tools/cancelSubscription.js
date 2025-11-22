const fs = require('fs');
const path = require('path');

async function cancelSubscription(input, openai) {
  console.log('cancelSubscription called with input:', input);
  
  // Load available subscriptions
  const subscriptionsPath = path.join(__dirname, '../data/subscriptions.json');
  const subscriptions = JSON.parse(fs.readFileSync(subscriptionsPath, 'utf8'));
  
  try {
    // Use OpenAI to match the subscription and generate cancellation details
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are a subscription cancellation assistant. Based on the user's request and available subscriptions, help cancel the subscription. Available subscriptions: ${JSON.stringify(subscriptions)}`
        },
        {
          role: 'user',
          content: `I want to cancel a subscription. Details: ${JSON.stringify(input)}`
        }
      ],
      functions: [
        {
          name: 'confirm_cancellation',
          description: 'Confirm the subscription cancellation',
          parameters: {
            type: 'object',
            properties: {
              subscriptionId: {
                type: 'number',
                description: 'ID of the subscription to cancel'
              },
              subscriptionName: {
                type: 'string',
                description: 'Name of the subscription'
              },
              currentAmount: {
                type: 'number',
                description: 'Current monthly/annual amount'
              },
              cancellationReason: {
                type: 'string',
                description: 'Reason for cancellation'
              },
              effectiveDate: {
                type: 'string',
                description: 'Date when cancellation takes effect'
              }
            },
            required: ['subscriptionId', 'subscriptionName', 'currentAmount', 'effectiveDate']
          }
        }
      ],
      function_call: { name: 'confirm_cancellation' }
    });

    const functionCall = response.choices[0].message.function_call;
    const cancellationDetails = JSON.parse(functionCall.arguments);

    // In a real implementation, this would:
    // 1. Call the subscription service's API
    // 2. Send cancellation confirmation email
    // 3. Update billing records
    
    return {
      success: true,
      message: 'Subscription cancellation initiated successfully',
      cancellation: {
        ...cancellationDetails,
        cancellationNumber: `CANC-${Date.now()}`,
        status: 'pending',
        estimatedSavings: `$${cancellationDetails.currentAmount}/month`
      },
      nextSteps: [
        'Cancellation request submitted',
        'Confirmation email sent',
        `Access continues until ${cancellationDetails.effectiveDate}`,
        'No further charges will be made'
      ]
    };

  } catch (error) {
    console.error('Error canceling subscription:', error);
    return {
      success: false,
      message: 'Failed to cancel subscription',
      error: error.message
    };
  }
}

module.exports = cancelSubscription;

