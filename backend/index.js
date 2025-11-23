const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

const scheduleDentist = require('../tools/scheduleDentist');
const cancelSubscription = require('../tools/cancelSubscription');
const disputeCharge = require('../tools/disputeCharge');
const runLifePilotAgent = require('../agents/lifePilotAgent');
const { runSearchBookingAgent, searchBestOptions, bookAppointment, checkPrices, researchProduct } = require('../agents/searchBookingAgent');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Initialize OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

app.get('/', (req, res) => {
  res.json({ status: "LifePilot backend running" });
});

// Main agent endpoint
app.post('/agent', async (req, res) => {
  try {
    const { input } = req.body;
    
    if (!input) {
      return res.status(400).json({ error: 'Input is required' });
    }

    const result = await runLifePilotAgent(input, openai);
    res.json(result);
  } catch (error) {
    console.error('Agent error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Schedule dentist endpoint
app.post('/api/schedule-dentist', async (req, res) => {
  try {
    const result = await scheduleDentist(req.body, openai);
    res.json(result);
  } catch (error) {
    console.error('Schedule dentist error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Cancel subscription endpoint
app.post('/api/cancel-subscription', async (req, res) => {
  try {
    const result = await cancelSubscription(req.body, openai);
    res.json(result);
  } catch (error) {
    console.error('Cancel subscription error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Dispute charge endpoint
app.post('/api/dispute-charge', async (req, res) => {
  try {
    const result = await disputeCharge(req.body, openai);
    res.json(result);
  } catch (error) {
    console.error('Dispute charge error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get mock data endpoints
app.get('/api/dentists', (req, res) => {
  const dentists = require('../data/dentists.json');
  res.json(dentists);
});

app.get('/api/subscriptions', (req, res) => {
  const subscriptions = require('../data/subscriptions.json');
  res.json(subscriptions);
});

app.get('/api/transactions', (req, res) => {
  const transactions = require('../data/transactions.json');
  res.json(transactions);
});

// Search and Booking Agent endpoints
app.post('/api/search', async (req, res) => {
  try {
    const { query, pollInterval, maxWaitTime } = req.body;
    
    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const options = {};
    if (pollInterval) options.pollInterval = pollInterval;
    if (maxWaitTime) options.maxWaitTime = maxWaitTime;

    const result = await searchBestOptions(query, options);
    res.json(result);
  } catch (error) {
    console.error('Search error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/book-appointment', async (req, res) => {
  try {
    const { appointmentType, preferences, pollInterval, maxWaitTime } = req.body;
    
    if (!appointmentType) {
      return res.status(400).json({ error: 'Appointment type is required' });
    }

    const options = {};
    if (pollInterval) options.pollInterval = pollInterval;
    if (maxWaitTime) options.maxWaitTime = maxWaitTime;

    const result = await bookAppointment(appointmentType, preferences || {}, options);
    res.json(result);
  } catch (error) {
    console.error('Book appointment error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/agent/search-booking', async (req, res) => {
  try {
    const { task, pollInterval, maxWaitTime } = req.body;
    
    if (!task) {
      return res.status(400).json({ error: 'Task is required' });
    }

    const options = {};
    if (pollInterval) options.pollInterval = pollInterval;
    if (maxWaitTime) options.maxWaitTime = maxWaitTime;

    const result = await runSearchBookingAgent(task, options);
    res.json(result);
  } catch (error) {
    console.error('Search booking agent error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Price comparison endpoint
app.post('/api/compare-prices', async (req, res) => {
  try {
    const { product, retailers, pollInterval, maxWaitTime } = req.body;
    
    if (!product) {
      return res.status(400).json({ error: 'Product is required' });
    }
    
    if (!retailers || !Array.isArray(retailers) || retailers.length === 0) {
      return res.status(400).json({ error: 'Retailers array is required and must not be empty' });
    }

    const options = {};
    if (pollInterval) options.pollInterval = pollInterval;
    if (maxWaitTime) options.maxWaitTime = maxWaitTime;

    const result = await checkPrices(product, retailers, options);
    res.json(result);
  } catch (error) {
    console.error('Price comparison error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Product research endpoint
app.post('/api/research-product', async (req, res) => {
  try {
    const { productName, pollInterval, maxWaitTime } = req.body;
    
    if (!productName) {
      return res.status(400).json({ error: 'Product name is required' });
    }

    const options = {};
    if (pollInterval) options.pollInterval = pollInterval;
    if (maxWaitTime) options.maxWaitTime = maxWaitTime;

    const result = await researchProduct(productName, options);
    res.json(result);
  } catch (error) {
    console.error('Product research error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`LifePilot backend running on port ${PORT}`);
});

