const express = require('express');
const cors = require('cors');
const OpenAI = require('openai');
require('dotenv').config();

const scheduleDentist = require('../tools/scheduleDentist');
const cancelSubscription = require('../tools/cancelSubscription');
const disputeCharge = require('../tools/disputeCharge');
const runLifePilotAgent = require('../agents/lifePilotAgent');
const { runSearchBookingAgent, searchBestOptions, bookAppointment, checkPrices, researchProduct } = require('../agents/searchBookingAgent');
const { routeAgent } = require('../agents/agentRouter');

// Import models and services
const User = require('./models/user');
const Action = require('./models/action');
const Memory = require('./models/memory');
const Feedback = require('./models/feedback');
const ConfirmationService = require('./services/confirmationService');
const FeedbackService = require('./services/feedbackService');
const MemoryService = require('./services/memoryService');

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

// ============= UNIFIED AGENT API =============
// Single endpoint that analyzes user input and routes to appropriate agent
app.post('/api/agent', async (req, res) => {
  try {
    const { input, userId, pollInterval, maxWaitTime } = req.body;
    
    if (!input) {
      return res.status(400).json({ error: 'Input is required' });
    }

    const options = { userId };
    if (pollInterval) options.pollInterval = pollInterval;
    if (maxWaitTime) options.maxWaitTime = maxWaitTime;

    // Route to appropriate agent based on context analysis
    const result = await routeAgent(input, openai, options);
    res.json(result);
  } catch (error) {
    console.error('Unified agent error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Legacy agent endpoint (kept for backward compatibility)
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

// ============= NEW ENHANCED ENDPOINTS =============

// User Management
app.post('/api/users', async (req, res) => {
  try {
    const { email, phone, name } = req.body;
    
    // Check if user already exists
    const existing = User.findByEmail(email);
    if (existing) {
      return res.json({ user: existing, message: 'User already exists' });
    }
    
    const user = User.create({ email, phone, name });
    res.json({ user, message: 'User created successfully' });
  } catch (error) {
    console.error('Create user error:', error);
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

app.post('/api/actions/:actionId/approve', async (req, res) => {
  try {
    const { userId, modifications } = req.body;
    const result = await ConfirmationService.approveAction(req.params.actionId, userId, modifications);
    res.json(result);
  } catch (error) {
    console.error('Approve action error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/actions/:actionId/reject', async (req, res) => {
  try {
    const { userId, reason } = req.body;
    const result = await ConfirmationService.rejectAction(req.params.actionId, userId, reason);
    res.json(result);
  } catch (error) {
    console.error('Reject action error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/actions/:actionId/execute', async (req, res) => {
  try {
    const action = Action.findById(req.params.actionId);
    if (!action) {
      return res.status(404).json({ error: 'Action not found' });
    }
    
    // Determine which execution function to use
    let executionFunction;
    switch (action.type) {
      case 'schedule_dentist_appointment':
        executionFunction = async (act) => await scheduleDentist(act.metadata, openai);
        break;
      case 'cancel_subscription':
        executionFunction = async (act) => await cancelSubscription(act.metadata, openai);
        break;
      case 'dispute_credit_card_charge':
        executionFunction = async (act) => await disputeCharge(act.metadata, openai);
        break;
      default:
        throw new Error(`Unknown action type: ${action.type}`);
    }
    
    const result = await ConfirmationService.executeAction(req.params.actionId, executionFunction);
    res.json(result);
  } catch (error) {
    console.error('Execute action error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/actions/:actionId', async (req, res) => {
  try {
    const { userId } = req.query;
    const status = await ConfirmationService.getActionStatus(req.params.actionId, userId);
    res.json(status);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get user's action history (timeline)
app.get('/api/users/:userId/actions', async (req, res) => {
  try {
    const actions = Action.findByUserId(req.params.userId);
    res.json({ count: actions.length, actions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Feedback System
app.post('/api/feedback', async (req, res) => {
  try {
    const { userId, actionId, rating, wasCorrect, comment, corrections, mistakeType } = req.body;
    
    const result = await FeedbackService.submitFeedback(userId, actionId, {
      rating,
      wasCorrect,
      comment,
      corrections,
      mistakeType
    });
    
    res.json(result);
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:userId/preferences', async (req, res) => {
  try {
    const preferences = await FeedbackService.getUserPreferences(req.params.userId);
    res.json(preferences);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:userId/mistake-analysis', async (req, res) => {
  try {
    const analysis = await FeedbackService.getMistakeAnalysis(req.params.userId);
    res.json(analysis);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:userId/feedback-summary', async (req, res) => {
  try {
    const summary = await FeedbackService.getFeedbackSummary(req.params.userId);
    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Memory & Reminders System
app.post('/api/users/:userId/analyze-patterns', async (req, res) => {
  try {
    const result = await MemoryService.analyzeAndCreateMemories(req.params.userId);
    res.json(result);
  } catch (error) {
    console.error('Analyze patterns error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:userId/reminders', async (req, res) => {
  try {
    const { daysAhead } = req.query;
    const reminders = await MemoryService.getUpcomingReminders(
      req.params.userId, 
      parseInt(daysAhead) || 30
    );
    res.json(reminders);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:userId/proactive-suggestions', async (req, res) => {
  try {
    const suggestions = await MemoryService.generateProactiveSuggestions(req.params.userId);
    res.json({ count: suggestions.length, suggestions });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/memories', async (req, res) => {
  try {
    const { userId, type, category, title, description, pattern, nextTrigger, metadata } = req.body;
    
    const result = await MemoryService.createCustomMemory(userId, {
      type,
      category,
      title,
      description,
      pattern,
      nextTrigger,
      metadata
    });
    
    res.json(result);
  } catch (error) {
    console.error('Create memory error:', error);
    res.status(500).json({ error: error.message });
  }
});

app.get('/api/users/:userId/memories', async (req, res) => {
  try {
    const memories = await MemoryService.getUserMemories(req.params.userId);
    res.json(memories);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/memories/:memoryId', async (req, res) => {
  try {
    const { userId, ...updates } = req.body;
    const result = await MemoryService.updateMemory(req.params.memoryId, userId, updates);
    res.json(result);
  } catch (error) {
    console.error('Update memory error:', error);
    res.status(500).json({ error: error.message });
  }
});

// Email & Phone Integration (Placeholder for real integration)
app.post('/api/users/:userId/link-email', async (req, res) => {
  try {
    const { email, provider } = req.body;
    
    // In production, this would initiate OAuth flow
    const user = User.update(req.params.userId, {
      linkedAccounts: {
        ...User.findById(req.params.userId).linkedAccounts,
        email: { linked: true, provider, email }
      }
    });
    
    res.json({ 
      success: true, 
      message: 'Email linked successfully',
      user 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/:userId/link-phone', async (req, res) => {
  try {
    const { phone } = req.body;
    
    // In production, this would send verification SMS
    const user = User.update(req.params.userId, {
      linkedAccounts: {
        ...User.findById(req.params.userId).linkedAccounts,
        phone: { linked: true, verified: false, phone }
      }
    });
    
    res.json({ 
      success: true, 
      message: 'Verification code sent to phone',
      user 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/users/:userId/verify-phone', async (req, res) => {
  try {
    const { code } = req.body;
    
    // In production, verify the code
    const user = User.findById(req.params.userId);
    user.linkedAccounts.phone.verified = true;
    
    const updated = User.update(req.params.userId, {
      linkedAccounts: user.linkedAccounts
    });
    
    res.json({ 
      success: true, 
      message: 'Phone verified successfully',
      user: updated 
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(PORT, () => {
  console.log(`LifePilot backend running on port ${PORT}`);
});