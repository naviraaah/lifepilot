const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

const scheduleDentist = require('../tools/scheduleDentist');
const cancelSubscription = require('../tools/cancelSubscription');
const disputeCharge = require('../tools/disputeCharge');
const runLifePilotAgent = require('../agents/lifePilotAgent');

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

app.listen(PORT, () => {
  console.log(`LifePilot backend running on port ${PORT}`);
});

