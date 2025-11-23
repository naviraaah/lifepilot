// Feedback model - for reinforcement learning and breaking mistake loops
// Stores user feedback to improve future actions

const fs = require('fs');
const path = require('path');

const FEEDBACK_FILE = path.join(__dirname, '../../data/feedback.json');

const ensureDataDir = () => {
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

const initFeedbackFile = () => {
  ensureDataDir();
  if (!fs.existsSync(FEEDBACK_FILE)) {
    fs.writeFileSync(FEEDBACK_FILE, JSON.stringify([], null, 2));
  }
};

const loadFeedback = () => {
  initFeedbackFile();
  const data = fs.readFileSync(FEEDBACK_FILE, 'utf8');
  return JSON.parse(data);
};

const saveFeedback = (feedback) => {
  initFeedbackFile();
  fs.writeFileSync(FEEDBACK_FILE, JSON.stringify(feedback, null, 2));
};

class Feedback {
  constructor(data) {
    this.id = data.id || `fb_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.userId = data.userId;
    this.actionId = data.actionId;
    this.rating = data.rating; // 1-5 stars
    this.wasCorrect = data.wasCorrect; // true/false
    this.comment = data.comment || '';
    this.corrections = data.corrections || {}; // What should have been done differently
    this.mistakeType = data.mistakeType || null; // 'wrong_provider', 'wrong_time', 'wrong_amount', etc.
    this.learningPoints = data.learningPoints || []; // Extracted lessons
    this.appliedToModel = data.appliedToModel || false; // Whether this was used to improve the model
    this.createdAt = data.createdAt || new Date().toISOString();
  }

  static create(feedbackData) {
    const feedback = new Feedback(feedbackData);
    const allFeedback = loadFeedback();
    allFeedback.push(feedback);
    saveFeedback(allFeedback);
    
    // Immediately analyze and create learning points
    feedback.extractLearningPoints();
    
    return feedback;
  }

  static findById(id) {
    const allFeedback = loadFeedback();
    const feedbackData = allFeedback.find(f => f.id === id);
    return feedbackData ? new Feedback(feedbackData) : null;
  }

  static findByUserId(userId) {
    const allFeedback = loadFeedback();
    return allFeedback
      .filter(f => f.userId === userId)
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .map(f => new Feedback(f));
  }

  static findByActionId(actionId) {
    const allFeedback = loadFeedback();
    const feedbackData = allFeedback.find(f => f.actionId === actionId);
    return feedbackData ? new Feedback(feedbackData) : null;
  }

  extractLearningPoints() {
    // Analyze feedback to extract actionable learning points
    const learningPoints = [];
    
    if (!this.wasCorrect && this.corrections) {
      if (this.corrections.preferredProvider) {
        learningPoints.push({
          type: 'user_preference',
          category: 'provider',
          value: this.corrections.preferredProvider,
          weight: 1.0
        });
      }
      
      if (this.corrections.preferredTime) {
        learningPoints.push({
          type: 'user_preference',
          category: 'time',
          value: this.corrections.preferredTime,
          weight: 1.0
        });
      }
      
      if (this.corrections.avoidProvider) {
        learningPoints.push({
          type: 'negative_preference',
          category: 'provider',
          value: this.corrections.avoidProvider,
          weight: -1.0
        });
      }
    }
    
    // Update the feedback with learning points
    const allFeedback = loadFeedback();
    const index = allFeedback.findIndex(f => f.id === this.id);
    if (index !== -1) {
      allFeedback[index].learningPoints = learningPoints;
      saveFeedback(allFeedback);
    }
    
    return learningPoints;
  }

  static getPreferences(userId) {
    // Aggregate all learning points for a user into a preference map
    const userFeedback = Feedback.findByUserId(userId);
    const preferences = {
      providers: {},
      times: {},
      avoidProviders: new Set()
    };
    
    userFeedback.forEach(fb => {
      if (fb.learningPoints) {
        fb.learningPoints.forEach(point => {
          if (point.type === 'user_preference' && point.category === 'provider') {
            preferences.providers[point.value] = (preferences.providers[point.value] || 0) + point.weight;
          } else if (point.type === 'user_preference' && point.category === 'time') {
            preferences.times[point.value] = (preferences.times[point.value] || 0) + point.weight;
          } else if (point.type === 'negative_preference' && point.category === 'provider') {
            preferences.avoidProviders.add(point.value);
          }
        });
      }
    });
    
    return {
      preferredProviders: Object.entries(preferences.providers)
        .sort((a, b) => b[1] - a[1])
        .map(([name]) => name),
      preferredTimes: Object.entries(preferences.times)
        .sort((a, b) => b[1] - a[1])
        .map(([time]) => time),
      avoidProviders: Array.from(preferences.avoidProviders)
    };
  }

  static getMistakePatterns(userId) {
    // Identify repeated mistake patterns to break the loop
    const userFeedback = Feedback.findByUserId(userId);
    const mistakes = userFeedback.filter(f => !f.wasCorrect);
    
    const mistakeTypes = {};
    mistakes.forEach(m => {
      if (m.mistakeType) {
        mistakeTypes[m.mistakeType] = (mistakeTypes[m.mistakeType] || 0) + 1;
      }
    });
    
    return {
      totalMistakes: mistakes.length,
      mistakeTypes,
      successRate: userFeedback.length > 0 
        ? ((userFeedback.length - mistakes.length) / userFeedback.length * 100).toFixed(1) + '%'
        : 'N/A'
    };
  }
}

module.exports = Feedback;

