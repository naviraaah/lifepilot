// Memory model - stores learned patterns and recurring tasks
// This enables LifePilot to learn from user behavior and provide proactive assistance

const fs = require('fs');
const path = require('path');

const MEMORIES_FILE = path.join(__dirname, '../../data/memories.json');

const ensureDataDir = () => {
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

const initMemoriesFile = () => {
  ensureDataDir();
  if (!fs.existsSync(MEMORIES_FILE)) {
    fs.writeFileSync(MEMORIES_FILE, JSON.stringify([], null, 2));
  }
};

const loadMemories = () => {
  initMemoriesFile();
  const data = fs.readFileSync(MEMORIES_FILE, 'utf8');
  return JSON.parse(data);
};

const saveMemories = (memories) => {
  initMemoriesFile();
  fs.writeFileSync(MEMORIES_FILE, JSON.stringify(memories, null, 2));
};

class Memory {
  constructor(data) {
    this.id = data.id || `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.userId = data.userId;
    this.type = data.type; // 'recurring_task', 'preference', 'learned_pattern', 'annual_reminder'
    this.category = data.category; // 'subscription', 'appointment', 'financial', 'seasonal', etc.
    this.title = data.title; // e.g., "Cancel gym membership every year"
    this.description = data.description;
    this.pattern = data.pattern || {}; // Extracted pattern information
    this.triggers = data.triggers || []; // When to remind: dates, conditions
    this.metadata = data.metadata || {}; // Additional context
    this.confidence = data.confidence || 0.7; // How confident we are in this pattern
    this.occurrences = data.occurrences || 1; // How many times this pattern appeared
    this.lastTriggered = data.lastTriggered || null;
    this.nextTrigger = data.nextTrigger || null;
    this.active = data.active !== false; // Default true
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  static create(memoryData) {
    const memory = new Memory(memoryData);
    const memories = loadMemories();
    memories.push(memory);
    saveMemories(memories);
    return memory;
  }

  static findById(id) {
    const memories = loadMemories();
    const memoryData = memories.find(m => m.id === id);
    return memoryData ? new Memory(memoryData) : null;
  }

  static findByUserId(userId) {
    const memories = loadMemories();
    return memories
      .filter(m => m.userId === userId && m.active)
      .sort((a, b) => new Date(b.updatedAt) - new Date(a.updatedAt))
      .map(m => new Memory(m));
  }

  static findUpcomingReminders(userId, daysAhead = 30) {
    const memories = loadMemories();
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + daysAhead);

    return memories
      .filter(m => {
        if (!m.active || m.userId !== userId || !m.nextTrigger) return false;
        const triggerDate = new Date(m.nextTrigger);
        return triggerDate >= now && triggerDate <= futureDate;
      })
      .sort((a, b) => new Date(a.nextTrigger) - new Date(b.nextTrigger))
      .map(m => new Memory(m));
  }

  static update(id, updates) {
    const memories = loadMemories();
    const index = memories.findIndex(m => m.id === id);
    if (index !== -1) {
      memories[index] = { 
        ...memories[index], 
        ...updates, 
        updatedAt: new Date().toISOString() 
      };
      saveMemories(memories);
      return new Memory(memories[index]);
    }
    return null;
  }

  incrementOccurrence() {
    const newOccurrences = this.occurrences + 1;
    const newConfidence = Math.min(0.95, this.confidence + 0.05); // Increase confidence
    return Memory.update(this.id, {
      occurrences: newOccurrences,
      confidence: newConfidence
    });
  }

  static detectPattern(userId, actions) {
    // Analyze user actions to detect recurring patterns
    // This is a simplified version - in production, use ML
    
    const patterns = {};
    
    actions.forEach(action => {
      const key = `${action.type}_${JSON.stringify(action.metadata)}`;
      if (!patterns[key]) {
        patterns[key] = {
          type: action.type,
          metadata: action.metadata,
          dates: []
        };
      }
      patterns[key].dates.push(new Date(action.createdAt));
    });

    const detectedMemories = [];

    Object.values(patterns).forEach(pattern => {
      if (pattern.dates.length >= 2) {
        // Calculate time difference between occurrences
        pattern.dates.sort((a, b) => a - b);
        const intervals = [];
        for (let i = 1; i < pattern.dates.length; i++) {
          const daysDiff = (pattern.dates[i] - pattern.dates[i-1]) / (1000 * 60 * 60 * 24);
          intervals.push(daysDiff);
        }
        
        const avgInterval = intervals.reduce((a, b) => a + b, 0) / intervals.length;
        
        // If intervals are roughly yearly (330-380 days), it's likely an annual task
        if (avgInterval >= 330 && avgInterval <= 380) {
          const nextTrigger = new Date(pattern.dates[pattern.dates.length - 1]);
          nextTrigger.setDate(nextTrigger.getDate() + avgInterval - 14); // Remind 2 weeks before
          
          detectedMemories.push({
            userId,
            type: 'recurring_task',
            category: pattern.type,
            title: `Annual ${pattern.type.replace('_', ' ')}`,
            description: `You typically do this every ${Math.round(avgInterval)} days`,
            pattern: {
              interval: avgInterval,
              unit: 'days',
              lastOccurrence: pattern.dates[pattern.dates.length - 1]
            },
            confidence: 0.7 + (pattern.dates.length * 0.05),
            occurrences: pattern.dates.length,
            nextTrigger: nextTrigger.toISOString(),
            metadata: pattern.metadata
          });
        }
      }
    });

    return detectedMemories;
  }
}

module.exports = Memory;

