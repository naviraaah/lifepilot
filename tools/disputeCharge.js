async function disputeCharge(input) {
  console.log('disputeCharge called with input:', input);
  return {
    success: true,
    message: 'Mock charge dispute submitted',
    data: input
  };
}

module.exports = disputeCharge;

