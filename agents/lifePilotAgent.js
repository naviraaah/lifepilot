async function runLifePilotAgent(input) {
  console.log('LifePilot agent received input:', input);
  
  const inputLower = input.toLowerCase();
  
  if (inputLower.includes('dentist')) {
    return {
      action: 'schedule_dentist',
      summary: 'Found dentist scheduling request. Mock appointment scheduled.',
      details: { keyword: 'dentist', input }
    };
  }
  
  if (inputLower.includes('cancel')) {
    return {
      action: 'cancel_subscription',
      summary: 'Found cancellation request. Mock subscription cancellation initiated.',
      details: { keyword: 'cancel', input }
    };
  }
  
  if (inputLower.includes('dispute')) {
    return {
      action: 'dispute_charge',
      summary: 'Found dispute request. Mock charge dispute submitted.',
      details: { keyword: 'dispute', input }
    };
  }
  
  return {
    action: 'unknown',
    summary: 'No matching action found. This is a placeholder response.',
    details: { input }
  };
}

module.exports = runLifePilotAgent;

