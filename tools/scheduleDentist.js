async function scheduleDentist(input) {
  console.log('scheduleDentist called with input:', input);
  return {
    success: true,
    message: 'Mock dentist appointment scheduled',
    data: input
  };
}

module.exports = scheduleDentist;

