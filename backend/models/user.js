// User model for LifePilot
// In production, this would use a real database (PostgreSQL, MongoDB, etc.)

const fs = require('fs');
const path = require('path');

const USERS_FILE = path.join(__dirname, '../../data/users.json');

// Ensure data directory exists
const ensureDataDir = () => {
  const dataDir = path.join(__dirname, '../../data');
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
};

// Initialize users file if it doesn't exist
const initUsersFile = () => {
  ensureDataDir();
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, JSON.stringify([], null, 2));
  }
};

// Load all users
const loadUsers = () => {
  initUsersFile();
  const data = fs.readFileSync(USERS_FILE, 'utf8');
  return JSON.parse(data);
};

// Save all users
const saveUsers = (users) => {
  initUsersFile();
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
};

class User {
  constructor(data) {
    this.id = data.id || Date.now().toString();
    this.email = data.email;
    this.phone = data.phone;
    this.name = data.name;
    this.preferences = data.preferences || {
      timezone: 'America/Los_Angeles',
      notificationEmail: true,
      notificationSMS: true,
      autoApproveAfterTraining: false, // Requires user confirmation initially
      trainingRounds: 0 // Number of successful actions
    };
    this.trustLevel = data.trustLevel || 'new'; // new, training, trusted, autonomous
    this.linkedAccounts = data.linkedAccounts || {
      email: { linked: false, provider: null },
      phone: { linked: false, verified: false },
      calendar: { linked: false, provider: null }
    };
    this.createdAt = data.createdAt || new Date().toISOString();
    this.lastActive = data.lastActive || new Date().toISOString();
  }

  static create(userData) {
    const user = new User(userData);
    const users = loadUsers();
    users.push(user);
    saveUsers(users);
    return user;
  }

  static findById(id) {
    const users = loadUsers();
    const userData = users.find(u => u.id === id);
    return userData ? new User(userData) : null;
  }

  static findByEmail(email) {
    const users = loadUsers();
    const userData = users.find(u => u.email === email);
    return userData ? new User(userData) : null;
  }

  static update(id, updates) {
    const users = loadUsers();
    const index = users.findIndex(u => u.id === id);
    if (index !== -1) {
      users[index] = { ...users[index], ...updates, lastActive: new Date().toISOString() };
      saveUsers(users);
      return new User(users[index]);
    }
    return null;
  }

  updateTrustLevel() {
    const trainingRounds = this.preferences.trainingRounds;
    if (trainingRounds >= 10) {
      this.trustLevel = 'autonomous';
      this.preferences.autoApproveAfterTraining = true;
    } else if (trainingRounds >= 5) {
      this.trustLevel = 'trusted';
    } else if (trainingRounds >= 1) {
      this.trustLevel = 'training';
    }
    return User.update(this.id, { 
      trustLevel: this.trustLevel, 
      preferences: this.preferences 
    });
  }
}

module.exports = User;

