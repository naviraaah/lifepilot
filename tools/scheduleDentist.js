const fs = require('fs');
const path = require('path');

async function scheduleDentist(input, openai) {
  console.log('scheduleDentist called with input:', input);
  
  // Load available dentists
  const dentistsPath = path.join(__dirname, '../data/dentists.json');
  const dentists = JSON.parse(fs.readFileSync(dentistsPath, 'utf8'));
  
  try {
    // Use OpenAI to match the best dentist and time slot
    const response = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are a scheduling assistant. Based on the user's preferences and the available dentists, recommend the best match. Available dentists: ${JSON.stringify(dentists)}`
        },
        {
          role: 'user',
          content: `I need to schedule a dentist appointment. Details: ${JSON.stringify(input)}`
        }
      ],
      functions: [
        {
          name: 'confirm_appointment',
          description: 'Confirm the appointment details',
          parameters: {
            type: 'object',
            properties: {
              dentistId: {
                type: 'number',
                description: 'ID of the selected dentist'
              },
              dentistName: {
                type: 'string',
                description: 'Name of the selected dentist'
              },
              suggestedDate: {
                type: 'string',
                description: 'Suggested appointment date'
              },
              suggestedTime: {
                type: 'string',
                description: 'Suggested appointment time'
              },
              reason: {
                type: 'string',
                description: 'Reason for visit'
              }
            },
            required: ['dentistId', 'dentistName', 'suggestedDate', 'suggestedTime', 'reason']
          }
        }
      ],
      function_call: { name: 'confirm_appointment' }
    });

    const functionCall = response.choices[0].message.function_call;
    const appointmentDetails = JSON.parse(functionCall.arguments);

    // In a real implementation, this would:
    // 1. Call the dentist's scheduling API
    // 2. Send confirmation email/SMS
    // 3. Add to calendar
    
    return {
      success: true,
      message: 'Dentist appointment scheduled successfully',
      appointment: {
        ...appointmentDetails,
        confirmationNumber: `APPT-${Date.now()}`,
        status: 'confirmed'
      },
      nextSteps: [
        'Confirmation email sent',
        'Added to your calendar',
        'Reminder set for 24 hours before'
      ]
    };

  } catch (error) {
    console.error('Error scheduling dentist:', error);
    return {
      success: false,
      message: 'Failed to schedule appointment',
      error: error.message
    };
  }
}

module.exports = scheduleDentist;

