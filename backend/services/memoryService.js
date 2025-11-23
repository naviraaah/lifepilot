// Memory Service - manages recurring tasks and learned patterns

const Memory = require('../models/memory');
const Action = require('../models/action');

class MemoryService {
  /**
   * Analyze user actions to detect recurring patterns
   */
  static async analyzeAndCreateMemories(userId) {
    // Get user's action history
    const actions = Action.findByUserId(userId, 100);
    
    // Detect patterns
    const detectedPatterns = Memory.detectPattern(userId, actions);
    
    // Create memory entries for detected patterns
    const createdMemories = [];
    for (const pattern of detectedPatterns) {
      // Check if similar memory already exists
      const existingMemories = Memory.findByUserId(userId);
      const similar = existingMemories.find(m => 
        m.category === pattern.category && 
        m.type === pattern.type
      );
      
      if (similar) {
        // Update existing memory
        similar.incrementOccurrence();
      } else {
        // Create new memory
        const memory = Memory.create(pattern);
        createdMemories.push(memory);
      }
    }
    
    return {
      success: true,
      patternsDetected: detectedPatterns.length,
      newMemories: createdMemories.length,
      memories: createdMemories
    };
  }

  /**
   * Get upcoming reminders for a user
   */
  static async getUpcomingReminders(userId, daysAhead = 30) {
    const reminders = Memory.findUpcomingReminders(userId, daysAhead);
    
    return {
      count: reminders.length,
      reminders: reminders.map(r => ({
        id: r.id,
        title: r.title,
        description: r.description,
        triggerDate: r.nextTrigger,
        daysUntil: Math.ceil(
          (new Date(r.nextTrigger) - new Date()) / (1000 * 60 * 60 * 24)
        ),
        confidence: r.confidence,
        category: r.category
      }))
    };
  }

  /**
   * Create a custom recurring reminder
   */
  static async createCustomMemory(userId, memoryData) {
    const memory = Memory.create({
      userId,
      type: memoryData.type || 'recurring_task',
      category: memoryData.category,
      title: memoryData.title,
      description: memoryData.description,
      pattern: memoryData.pattern || {},
      nextTrigger: memoryData.nextTrigger,
      metadata: memoryData.metadata || {},
      confidence: 1.0 // User-created, so full confidence
    });

    return {
      success: true,
      memoryId: memory.id,
      message: 'Reminder created successfully',
      memory
    };
  }

  /**
   * Get all memories for a user
   */
  static async getUserMemories(userId) {
    const memories = Memory.findByUserId(userId);
    
    return {
      count: memories.length,
      memories: memories.map(m => ({
        id: m.id,
        type: m.type,
        category: m.category,
        title: m.title,
        description: m.description,
        nextTrigger: m.nextTrigger,
        confidence: m.confidence,
        occurrences: m.occurrences,
        active: m.active
      }))
    };
  }

  /**
   * Update a memory (mark as complete, snooze, etc.)
   */
  static async updateMemory(memoryId, userId, updates) {
    const memory = Memory.findById(memoryId);
    
    if (!memory) {
      throw new Error('Memory not found');
    }

    if (memory.userId !== userId) {
      throw new Error('Unauthorized');
    }

    // If completing a recurring task, calculate next trigger
    if (updates.completed && memory.pattern.interval) {
      const nextTrigger = new Date();
      nextTrigger.setDate(nextTrigger.getDate() + memory.pattern.interval - 14);
      updates.nextTrigger = nextTrigger.toISOString();
      updates.lastTriggered = new Date().toISOString();
    }

    const updatedMemory = Memory.update(memoryId, updates);

    return {
      success: true,
      memory: updatedMemory
    };
  }

  /**
   * Generate proactive suggestions based on memories
   */
  static async generateProactiveSuggestions(userId) {
    const memories = Memory.findByUserId(userId);
    const now = new Date();
    const twoWeeksFromNow = new Date();
    twoWeeksFromNow.setDate(twoWeeksFromNow.getDate() + 14);

    const suggestions = [];

    for (const memory of memories) {
      if (!memory.nextTrigger) continue;
      
      const triggerDate = new Date(memory.nextTrigger);
      
      // If trigger is within 2 weeks
      if (triggerDate >= now && triggerDate <= twoWeeksFromNow) {
        const daysUntil = Math.ceil((triggerDate - now) / (1000 * 60 * 60 * 24));
        
        suggestions.push({
          memoryId: memory.id,
          title: memory.title,
          category: memory.category,
          daysUntil,
          urgency: daysUntil <= 7 ? 'high' : 'medium',
          message: this.generateReminderMessage(memory, daysUntil),
          actionSuggested: this.suggestAction(memory)
        });
      }
    }

    // Sort by urgency
    suggestions.sort((a, b) => a.daysUntil - b.daysUntil);

    return suggestions;
  }

  /**
   * Generate a friendly reminder message
   */
  static generateReminderMessage(memory, daysUntil) {
    const dayText = daysUntil === 1 ? 'tomorrow' : `in ${daysUntil} days`;
    
    if (memory.category === 'cancel_subscription') {
      return `Hey! Last year you cancelled a subscription around this time. Would you like me to review your subscriptions?`;
    } else if (memory.category === 'schedule_dentist_appointment') {
      return `Remember, it's time for your dental checkup. You usually book one around this time. Should I find available appointments?`;
    } else {
      return `Based on your pattern, you typically handle "${memory.title}" ${dayText}. Need help with that?`;
    }
  }

  /**
   * Suggest an action based on memory
   */
  static suggestAction(memory) {
    return {
      type: memory.category,
      label: `Help me with this`,
      data: memory.metadata
    };
  }
}

module.exports = MemoryService;

