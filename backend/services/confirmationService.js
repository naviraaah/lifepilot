// Confirmation Service - handles the user approval workflow
// This is key for building trust and allowing users to review before execution

const Action = require('../models/action');
const User = require('../models/user');

class ConfirmationService {
  /**
   * Create an action plan and wait for user approval
   */
  static async createActionPlan(userId, actionType, input, openai) {
    const user = User.findById(userId);
    
    // Generate step-by-step plan using AI
    const planResponse = await openai.chat.completions.create({
      model: 'gpt-4-turbo-preview',
      messages: [
        {
          role: 'system',
          content: `You are LifePilot, an AI assistant that helps with life admin tasks. 
          Create a detailed, transparent step-by-step plan for the user's request.
          Be specific about what actions you will take.
          Include any assumptions you're making.
          Format your response as a JSON object with:
          - summary: brief overview
          - steps: array of step objects with {number, description, details}
          - assumptions: array of assumptions
          - estimatedTime: how long this will take
          - confidence: your confidence level (0-1)`
        },
        {
          role: 'user',
          content: `User request: ${input}\nAction type: ${actionType}`
        }
      ],
      response_format: { type: "json_object" }
    });

    const plan = JSON.parse(planResponse.choices[0].message.content);

    // Determine if approval is required based on user's trust level
    let requiresApproval = true;
    if (user) {
      if (user.trustLevel === 'autonomous' && user.preferences.autoApproveAfterTraining) {
        requiresApproval = false;
      } else if (user.trustLevel === 'trusted' && plan.confidence > 0.9) {
        requiresApproval = false;
      }
    }

    // Create action record
    const action = Action.create({
      userId,
      type: actionType,
      status: requiresApproval ? 'pending_approval' : 'approved',
      input,
      planSteps: plan.steps,
      confidence: plan.confidence,
      requiresApproval,
      metadata: {
        summary: plan.summary,
        assumptions: plan.assumptions,
        estimatedTime: plan.estimatedTime
      }
    });

    return {
      actionId: action.id,
      requiresApproval,
      plan: {
        summary: plan.summary,
        steps: plan.steps,
        assumptions: plan.assumptions,
        estimatedTime: plan.estimatedTime,
        confidence: plan.confidence
      },
      trustLevel: user?.trustLevel || 'new',
      message: requiresApproval
        ? 'Please review and approve this plan before I proceed.'
        : 'I have high confidence in this plan and will proceed automatically.'
    };
  }

  /**
   * User approves an action
   */
  static async approveAction(actionId, userId, modifications = null) {
    const action = Action.findById(actionId);
    
    if (!action) {
      throw new Error('Action not found');
    }

    if (action.userId !== userId) {
      throw new Error('Unauthorized');
    }

    if (action.status !== 'pending_approval') {
      throw new Error('Action is not pending approval');
    }

    // Apply modifications if provided
    if (modifications) {
      Action.update(actionId, {
        metadata: { ...action.metadata, userModifications: modifications }
      });
    }

    // Approve the action
    const approvedAction = action.approve(userId);

    return {
      success: true,
      actionId: approvedAction.id,
      message: 'Action approved and ready for execution',
      nextStep: 'execute'
    };
  }

  /**
   * User rejects an action
   */
  static async rejectAction(actionId, userId, reason) {
    const action = Action.findById(actionId);
    
    if (!action) {
      throw new Error('Action not found');
    }

    if (action.userId !== userId) {
      throw new Error('Unauthorized');
    }

    // Cancel the action
    Action.update(actionId, {
      status: 'cancelled',
      metadata: { 
        ...action.metadata, 
        cancellationReason: reason,
        cancelledAt: new Date().toISOString()
      }
    });

    return {
      success: true,
      actionId,
      message: 'Action cancelled',
      feedback: 'Thank you for the feedback. I\'ll learn from this.'
    };
  }

  /**
   * Execute an approved action
   */
  static async executeAction(actionId, executionFunction) {
    const action = Action.findById(actionId);
    
    if (!action) {
      throw new Error('Action not found');
    }

    if (action.status !== 'approved') {
      throw new Error('Action must be approved before execution');
    }

    // Update status to executing
    Action.update(actionId, { status: 'executing' });

    try {
      // Execute the action
      const result = await executionFunction(action);

      // Mark as completed
      const completedAction = action.complete(result);

      // Update user's training rounds (for trust level progression)
      const user = User.findById(action.userId);
      if (user) {
        user.preferences.trainingRounds += 1;
        user.updateTrustLevel();
      }

      return {
        success: true,
        actionId: completedAction.id,
        result,
        message: 'Action completed successfully',
        requestFeedback: true
      };
    } catch (error) {
      // Mark as failed
      action.fail(error.message);

      return {
        success: false,
        actionId: action.id,
        error: error.message,
        message: 'Action failed. Please try again or contact support.'
      };
    }
  }

  /**
   * Get action status and details
   */
  static async getActionStatus(actionId, userId) {
    const action = Action.findById(actionId);
    
    if (!action) {
      throw new Error('Action not found');
    }

    if (action.userId !== userId) {
      throw new Error('Unauthorized');
    }

    return {
      actionId: action.id,
      status: action.status,
      type: action.type,
      plan: action.planSteps,
      executedSteps: action.executedSteps,
      result: action.result,
      createdAt: action.createdAt,
      completedAt: action.completedAt,
      feedback: action.feedback
    };
  }
}

module.exports = ConfirmationService;

