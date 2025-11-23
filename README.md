# ✈️ LifePilot

**Your Autonomous Life-Admin Agent**

LifePilot is an AI-powered operations assistant that handles your daily life tasks end-to-end, from scheduling appointments to managing subscriptions and disputing charges.

## 🌟 Features

### Core Capabilities

1. **🦷 Schedule Dentist Appointments**
   - Natural language appointment requests
   - Provider search and filtering by location/time
   - Automatic booking and confirmation
   - Calendar integration

2. **❌ Cancel Subscriptions**
   - Navigate subscription portals automatically
   - Handle cancellation flows
   - Track cancellation events in your timeline
   - Save time on tedious processes

3. **💳 Dispute Credit Card Charges**
   - Extract transaction details
   - Auto-fill dispute forms
   - Submit disputes to your bank
   - Track dispute status

4. **📅 Memory for Recurring Tasks**
   - Learn from your annual patterns
   - Proactive reminders before renewals
   - Smart suggestions based on history
   - Long-term personal COO functionality

### Trust-Building Features

#### User Confirmation Layer
- **Transparent Action Plans**: Before executing any task, LifePilot shows you:
  - Step-by-step plan
  - Assumptions being made
  - Estimated time
  - Confidence level
- **Review & Approve**: You approve plans before execution (initially)
- **Progressive Trust**: As LifePilot learns and succeeds, it gains autonomy

#### Trust Levels
- **New** 👋: Always requires approval
- **Training** 📚: Requires approval (1-4 successful actions)
- **Trusted** ✅: Auto-approves high-confidence actions (5-9 successful actions)
- **Autonomous** 🤖: Full autonomy for trained tasks (10+ successful actions)

#### Feedback & Reinforcement Learning
- **Rate Each Action**: 1-5 star rating system
- **Correction Mechanism**: If LifePilot makes a mistake, tell it what went wrong
- **Learning Points**: System extracts preferences and avoids repeat mistakes
- **Mistake Analysis**: Track patterns and improvement over time

#### Transparency & Safety
- Detailed execution logs
- Complete action timeline/history
- Ability to reject or modify plans
- Privacy-focused feedback

## 🏗️ Architecture

### Backend (`/backend`)
- **Node.js + Express** REST API
- **OpenAI GPT-4** for intelligent decision-making
- **File-based storage** (easily upgradeable to PostgreSQL/MongoDB)

#### Models
- `User`: User profiles, preferences, trust levels
- `Action`: Complete action records with approval flow
- `Memory`: Learned patterns and recurring tasks
- `Feedback`: User ratings and corrections

#### Services
- `ConfirmationService`: Multi-step approval workflow
- `FeedbackService`: Learning and improvement
- `MemoryService`: Pattern detection and reminders

#### Tools
- `scheduleDentist.js`: Dentist appointment booking
- `cancelSubscription.js`: Subscription cancellation
- `disputeCharge.js`: Charge dispute filing

### Frontend (`/frontend`)
- **Next.js 16** with App Router
- **React 19** with Server Components
- **TypeScript** for type safety
- **Mobile-responsive** modern UI

#### Key Pages
- `/dashboard`: Main hub with suggestions, reminders, and stats
- `/confirm`: Action approval with transparent plan review
- `/timeline`: Complete action history
- `/feedback`: Rating and correction interface

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- OpenAI API Key

### Installation

1. **Clone the repository**
```bash
git clone <repository-url>
cd lifepilot
```

2. **Set up the backend**
```bash
cd backend
npm install

# Create .env file
echo "OPENAI_API_KEY=your_openai_api_key_here" > .env
echo "PORT=3001" >> .env

# Start the backend
node index.js
```

3. **Set up the frontend**
```bash
cd frontend
npm install

# Create .env.local file
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local

# Start the frontend
npm run dev
```

4. **Access the application**
Open [http://localhost:3000](http://localhost:3000) in your browser

## 📱 Usage

### First Time Setup
1. Open LifePilot dashboard
2. System creates a demo user profile
3. Start with a simple request to begin training

### Making Requests

**Natural language input examples:**
- "Find me a dentist near SoMa after 5pm next week"
- "Cancel my gym membership before it renews"
- "Dispute that $250 charge from Gas Station XYZ"
- "Remind me to renew my driver's license in 6 months"

### Approval Flow
1. **Request**: You make a natural language request
2. **Plan**: LifePilot creates a detailed action plan
3. **Review**: You review the plan, assumptions, and steps
4. **Approve/Reject**: Approve to proceed or reject with feedback
5. **Execute**: LifePilot executes the approved plan
6. **Feedback**: Rate the result and provide corrections if needed

### Building Trust
- Complete 5 successful actions → **Trusted** status
- Complete 10 successful actions → **Autonomous** status
- High-confidence actions auto-execute when trusted
- Provide feedback to improve accuracy

## 🎯 Key Endpoints

### User Management
- `POST /api/users` - Create user
- `GET /api/users/:userId` - Get user profile
- `PUT /api/users/:userId` - Update user

### Action Management
- `POST /api/actions/plan` - Create action plan
- `POST /api/actions/:actionId/approve` - Approve action
- `POST /api/actions/:actionId/reject` - Reject action
- `POST /api/actions/:actionId/execute` - Execute action
- `GET /api/users/:userId/actions` - Get action history

### Feedback System
- `POST /api/feedback` - Submit feedback
- `GET /api/users/:userId/preferences` - Get learned preferences
- `GET /api/users/:userId/mistake-analysis` - Get mistake patterns

### Memory & Reminders
- `POST /api/users/:userId/analyze-patterns` - Detect patterns
- `GET /api/users/:userId/reminders` - Get upcoming reminders
- `GET /api/users/:userId/proactive-suggestions` - Get suggestions
- `POST /api/memories` - Create custom reminder

### Integration (Placeholder)
- `POST /api/users/:userId/link-email` - Link email account
- `POST /api/users/:userId/link-phone` - Link phone number

## 🔐 Security & Privacy

- **Local First**: All data stored locally in JSON files
- **No External Sharing**: Your data never leaves your control
- **Transparent Operations**: Every action is logged and reviewable
- **User Consent**: Always requires approval for new action types
- **Secure by Default**: No auto-execution without trust level

## 🛠️ Customization

### Adding New Action Types

1. **Create Tool** (`/tools/yourAction.js`)
```javascript
async function yourAction(input, openai) {
  // Your implementation
  return { success: true, result: {...} };
}
module.exports = yourAction;
```

2. **Register in Agent** (`/agents/lifePilotAgent.js`)
```javascript
{
  type: 'function',
  function: {
    name: 'your_action',
    description: 'Description',
    parameters: { /* ... */ }
  }
}
```

3. **Add to Backend** (`/backend/index.js`)
```javascript
case 'your_action':
  executionFunction = async (act) => await yourAction(act.metadata, openai);
  break;
```

### Upgrading Storage

Replace file-based storage in `/backend/models` with your database:
- PostgreSQL with Prisma
- MongoDB with Mongoose
- Supabase
- Firebase

## 📈 Roadmap

- [ ] Real OAuth integration for email/calendar
- [ ] SMS verification for phone numbers
- [ ] Browser automation with Playwright for actual booking
- [ ] Machine learning for better pattern detection
- [ ] Multi-user support with authentication
- [ ] Mobile app (React Native)
- [ ] Voice interface
- [ ] More action types (flight booking, DMV, etc.)

## 🤝 Contributing

Contributions are welcome! This is a demonstration project showing:
- AI agent architecture with approval flows
- Trust-building UX patterns
- Feedback-driven improvement
- Memory and learning systems

## 📄 License

MIT License - feel free to use this as a starting point for your own projects

## 🙏 Acknowledgments

- Built with OpenAI GPT-4
- Inspired by the need to automate life admin tasks
- Focused on trust, transparency, and user control

---

**LifePilot** - Because life is too short for admin tasks ✈️
