const fs = require('fs');
const path = require('path');

async function disputeCharge(input, openai) {
  console.log('disputeCharge called with input:', input);
  
  // Load available transactions
  const transactionsPath = path.join(__dirname, '../data/transactions.json');
  const transactions = JSON.parse(fs.readFileSync(transactionsPath, 'utf8'));
  
  try {
    // Use OpenAI to match the transaction and generate dispute details
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are a credit card dispute assistant. Based on the user's complaint and transaction history, help file a dispute. Available transactions: ${JSON.stringify(transactions)}`
        },
        {
          role: 'user',
          content: `I want to dispute a charge. Details: ${JSON.stringify(input)}`
        }
      ],
      functions: [
        {
          name: 'confirm_dispute',
          description: 'Confirm the charge dispute',
          parameters: {
            type: 'object',
            properties: {
              transactionId: {
                type: 'number',
                description: 'ID of the transaction to dispute'
              },
              merchant: {
                type: 'string',
                description: 'Merchant name'
              },
              amount: {
                type: 'number',
                description: 'Amount being disputed'
              },
              disputeReason: {
                type: 'string',
                description: 'Reason for the dispute'
              },
              disputeCategory: {
                type: 'string',
                description: 'Category of dispute (fraud, billing error, quality issue, etc.)'
              }
            },
            required: ['transactionId', 'merchant', 'amount', 'disputeReason', 'disputeCategory']
          }
        }
      ],
      function_call: { name: 'confirm_dispute' }
    });

    const functionCall = response.choices[0].message.function_call;
    const disputeDetails = JSON.parse(functionCall.arguments);

    // In a real implementation, this would:
    // 1. Call the credit card company's API
    // 2. File the dispute claim
    // 3. Send confirmation documents
    // 4. Track dispute status
    
    return {
      success: true,
      message: 'Charge dispute filed successfully',
      dispute: {
        ...disputeDetails,
        disputeNumber: `DISP-${Date.now()}`,
        status: 'under_review',
        filedDate: new Date().toISOString().split('T')[0],
        estimatedResolutionDays: 30
      },
      nextSteps: [
        'Dispute claim filed with credit card company',
        'Temporary credit may be issued within 2-3 business days',
        'Investigation will take up to 30 days',
        'You will be notified of the outcome',
        'Keep all related documentation'
      ]
    };

  } catch (error) {
    console.error('Error disputing charge:', error);
    return {
      success: false,
      message: 'Failed to file dispute',
      error: error.message
    };
  }
}

module.exports = disputeCharge;

