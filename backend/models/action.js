// Action model - tracks all actions taken by LifePilot
// This creates a complete timeline/audit trail

const fs = require('fs');
const path = require('path');

const ACTIONS_FILE = path.join(__dirname, '../../data/actions.json');

const ensureDataDir = () => {
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

const initActionsFile = () => {
  ensureDataDir();
  if (!fs.existsSync(ACTIONS_FILE)) {
    fs.writeFileSync(ACTIONS_FILE, JSON.stringify([], null, 2));
  }
};

const loadActions = () => {
  initActionsFile();
  const data = fs.readFileSync(ACTIONS_FILE, 'utf8');
  return JSON.parse(data);
};

const saveActions = (actions) => {
  initActionsFile();
  fs.writeFileSync(ACTIONS_FILE, JSON.stringify(actions, null, 2));
};

class Action {
  constructor(data) {
    this.id = data.id || `action_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.userId = data.userId;
    this.type = data.type; // 'schedule_dentist', 'cancel_subscription', 'dispute_charge', etc.
    this.status = data.status || 'pending_approval'; // pending_approval, approved, executing, completed, failed, cancelled
    this.input = data.input; // Original user input
    this.planSteps = data.planSteps || []; // Step-by-step plan shown to user
    this.executedSteps = data.executedSteps || []; // Steps actually executed
    this.result = data.result || null;
    this.feedback = data.feedback || null; // User feedback after action
    this.confidence = data.confidence || 0.8; // AI confidence in action plan
    this.requiresApproval = data.requiresApproval !== false; // Default true
    this.metadata = data.metadata || {}; // Action-specific details
    this.createdAt = data.createdAt || new Date().toISOString();
    this.approvedAt = data.approvedAt || null;
    this.completedAt = data.completedAt || null;
    this.error = data.error || null;
  }

  static create(actionData) {
    const action = new Action(actionData);
    const actions = loadActions();
    actions.push(action);
    saveActions(actions);
    return action;
  }

  static findById(id) {
    const actions = loadActions();
    const actionData = actions.find(a => a.id === id);
    return actionData ? new Action(actionData) : null;
  }

  static findByUserId(userId, limit = 50) {
    const actions = loadActions();
    return actions
      .filter(a => a.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, limit)
      .map(a => new Action(a));
  }

  static update(id, updates) {
    const actions = loadActions();
    const index = actions.findIndex(a => a.id === id);
    if (index !== -1) {
      actions[index] = { ...actions[index], ...updates };
      saveActions(actions);
      return new Action(actions[index]);
    }
    return null;
  }

  approve(userId) {
    return Action.update(this.id, {
      status: 'approved',
      approvedAt: new Date().toISOString(),
      approvedBy: userId
    });
  }

  complete(result) {
    return Action.update(this.id, {
      status: 'completed',
      result: result,
      completedAt: new Date().toISOString()
    });
  }

  fail(error) {
    return Action.update(this.id, {
      status: 'failed',
      error: error,
      completedAt: new Date().toISOString()
    });
  }

  addFeedback(feedback) {
    return Action.update(this.id, {
      feedback: {
        rating: feedback.rating, // 1-5
        comment: feedback.comment,
        wasCorrect: feedback.wasCorrect,
        corrections: feedback.corrections,
        timestamp: new Date().toISOString()
      }
    });
  }
}

module.exports = Action;

