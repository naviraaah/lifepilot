// Feedback Service - handles user feedback and reinforcement learning

const Feedback = require('../models/feedback');
const Action = require('../models/action');
const User = require('../models/user');

class FeedbackService {
  /**
   * Submit feedback for a completed action
   */
  static async submitFeedback(userId, actionId, feedbackData) {
    const action = Action.findById(actionId);
    
    if (!action) {
      throw new Error('Action not found');
    }

    if (action.userId !== userId) {
      throw new Error('Unauthorized');
    }

    // Create feedback record
    const feedback = Feedback.create({
      userId,
      actionId,
      rating: feedbackData.rating,
      wasCorrect: feedbackData.wasCorrect,
      comment: feedbackData.comment,
      corrections: feedbackData.corrections,
      mistakeType: feedbackData.mistakeType
    });

    // Update action with feedback
    action.addFeedback({
      rating: feedbackData.rating,
      comment: feedbackData.comment,
      wasCorrect: feedbackData.wasCorrect,
      corrections: feedbackData.corrections
    });

    // If there was a mistake, adjust user's trust level
    if (!feedbackData.wasCorrect) {
      const user = User.findById(userId);
      if (user && user.preferences.trainingRounds > 0) {
        // Decrease training rounds on mistakes (but not below 0)
        user.preferences.trainingRounds = Math.max(0, user.preferences.trainingRounds - 1);
        user.updateTrustLevel();
      }
    }

    return {
      success: true,
      feedbackId: feedback.id,
      message: 'Thank you for your feedback! I\'m learning from this.',
      learningPoints: feedback.learningPoints
    };
  }

  /**
   * Get user's learned preferences from feedback history
   */
  static async getUserPreferences(userId) {
    return Feedback.getPreferences(userId);
  }

  /**
   * Get mistake patterns to help break loops
   */
  static async getMistakeAnalysis(userId) {
    const patterns = Feedback.getMistakePatterns(userId);
    const allFeedback = Feedback.findByUserId(userId);
    
    // Calculate improvement over time
    const recentFeedback = allFeedback.slice(0, 5);
    const olderFeedback = allFeedback.slice(5, 10);
    
    const recentSuccessRate = recentFeedback.length > 0
      ? recentFeedback.filter(f => f.wasCorrect).length / recentFeedback.length
      : 0;
    
    const olderSuccessRate = olderFeedback.length > 0
      ? olderFeedback.filter(f => f.wasCorrect).length / olderFeedback.length
      : 0;

    const improving = recentSuccessRate > olderSuccessRate;

    return {
      ...patterns,
      recentPerformance: {
        successRate: (recentSuccessRate * 100).toFixed(1) + '%',
        improving,
        trend: improving ? 'Getting better!' : 'Let\'s improve together'
      },
      recommendations: this.generateRecommendations(patterns)
    };
  }

  /**
   * Generate recommendations based on mistake patterns
   */
  static generateRecommendations(patterns) {
    const recommendations = [];

    if (patterns.totalMistakes === 0) {
      recommendations.push({
        type: 'positive',
        message: 'Perfect track record! Consider enabling autonomous mode.'
      });
      return recommendations;
    }

    // Check for specific mistake types
    if (patterns.mistakeTypes.wrong_provider >= 2) {
      recommendations.push({
        type: 'learning',
        message: 'I notice I\'ve selected the wrong provider a few times. Please add your preferred providers to your profile for better results.'
      });
    }

    if (patterns.mistakeTypes.wrong_time >= 2) {
      recommendations.push({
        type: 'learning',
        message: 'I\'m still learning your time preferences. Let me know your typical availability and I\'ll remember it.'
      });
    }

    if (patterns.totalMistakes > 5) {
      recommendations.push({
        type: 'caution',
        message: 'I\'m still learning your preferences. Please continue reviewing my suggestions before approval.'
      });
    }

    return recommendations;
  }

  /**
   * Get feedback summary for display
   */
  static async getFeedbackSummary(userId) {
    const allFeedback = Feedback.findByUserId(userId);
    
    if (allFeedback.length === 0) {
      return {
        totalActions: 0,
        message: 'No feedback yet. Complete some actions and let me know how I did!'
      };
    }

    const averageRating = allFeedback.reduce((sum, f) => sum + (f.rating || 0), 0) / allFeedback.length;
    const successCount = allFeedback.filter(f => f.wasCorrect).length;
    const successRate = (successCount / allFeedback.length * 100).toFixed(1);

    return {
      totalActions: allFeedback.length,
      successfulActions: successCount,
      successRate: successRate + '%',
      averageRating: averageRating.toFixed(1),
      message: successRate >= 80 
        ? 'Great partnership! We\'re working well together.' 
        : 'I\'m learning and improving with your help.'
    };
  }
}

module.exports = FeedbackService;

