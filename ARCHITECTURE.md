# 🏗️ LifePilot Architecture

Technical architecture and design decisions for LifePilot.

## System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        User Interface                        │
│         Next.js 16 + React 19 + TypeScript                  │
└─────────────────────────┬───────────────────────────────────┘
                          │ HTTP/REST
┌─────────────────────────▼───────────────────────────────────┐
│                      Backend API                             │
│           Express.js + OpenAI GPT-4                         │
├──────────────┬──────────────┬──────────────┬────────────────┤
│   Services   │    Models    │    Tools     │    Agents      │
└──────────────┴──────────────┴──────────────┴────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────────┐
│                   Data Storage                               │
│              JSON Files (upgradeable to DB)                  │
└─────────────────────────────────────────────────────────────┘
```

## Technology Stack

### Frontend
- **Framework**: Next.js 16 with App Router
- **UI Library**: React 19
- **Language**: TypeScript 5
- **Styling**: CSS Modules
- **HTTP Client**: Axios
- **State Management**: React Hooks (useState, useEffect)
- **Routing**: Next.js App Router

### Backend
- **Runtime**: Node.js 18+
- **Framework**: Express 5
- **AI**: OpenAI GPT-4 Turbo
- **Language**: JavaScript (CommonJS)
- **CORS**: Enabled for frontend
- **Environment**: dotenv

### Data Layer
- **Storage**: JSON files (filesystem)
- **Models**: JavaScript classes with CRUD operations
- **Upgrade Path**: PostgreSQL, MongoDB, or Supabase

## Project Structure

```
lifepilot/
├── frontend/                # Next.js frontend
│   ├── app/                # App router pages
│   │   ├── page.tsx       # Splash screen
│   │   ├── dashboard/     # Main dashboard
│   │   ├── confirm/       # Action confirmation
│   │   ├── timeline/      # Action history
│   │   ├── feedback/      # Feedback submission
│   │   └── globals.css    # Global styles
│   ├── lib/               # Utilities
│   │   └── api.ts         # API client
│   ├── public/            # Static assets
│   ├── package.json
│   └── next.config.ts
│
├── backend/               # Express backend
│   ├── models/           # Data models
│   │   ├── user.js       # User model
│   │   ├── action.js     # Action model
│   │   ├── memory.js     # Memory model
│   │   └── feedback.js   # Feedback model
│   ├── services/         # Business logic
│   │   ├── confirmationService.js
│   │   ├── feedbackService.js
│   │   └── memoryService.js
│   ├── index.js          # Main server file
│   └── package.json
│
├── agents/               # AI agents
│   └── lifePilotAgent.js # Main agent orchestrator
│
├── tools/                # Action executors
│   ├── scheduleDentist.js
│   ├── cancelSubscription.js
│   └── disputeCharge.js
│
├── data/                 # Data storage
│   ├── users.json        # User profiles
│   ├── actions.json      # Action records
│   ├── memories.json     # Learned patterns
│   ├── feedback.json     # User feedback
│   ├── dentists.json     # Mock data
│   ├── subscriptions.json
│   └── transactions.json
│
└── docs/                 # Documentation
    ├── README.md
    ├── SETUP.md
    ├── FEATURES.md
    └── ARCHITECTURE.md
```

## Core Components

### 1. Frontend Components

#### Pages
- **`/` (Splash)**: Landing page with auto-redirect
- **`/dashboard`**: Main hub with suggestions and stats
- **`/confirm`**: Action review and approval interface
- **`/timeline`**: Complete action history
- **`/feedback`**: Feedback collection form

#### API Client (`lib/api.ts`)
- Centralized Axios instance
- TypeScript interfaces
- Error handling
- Base URL configuration

### 2. Backend Services

#### Confirmation Service
**Purpose**: Handle multi-step approval workflow

**Key Methods:**
- `createActionPlan()`: Generate AI-powered plan
- `approveAction()`: User approves plan
- `rejectAction()`: User rejects with reason
- `executeAction()`: Execute approved plan
- `getActionStatus()`: Check action status

**Flow:**
```
User Request → AI Plan → User Review → Execution → Feedback
```

#### Feedback Service
**Purpose**: Collect and learn from user feedback

**Key Methods:**
- `submitFeedback()`: Save user feedback
- `getUserPreferences()`: Extract learned preferences
- `getMistakeAnalysis()`: Analyze error patterns
- `getFeedbackSummary()`: Performance metrics

**Learning Mechanism:**
```
Feedback → Extract Learning Points → Update Preferences → Apply to Future
```

#### Memory Service
**Purpose**: Detect patterns and create reminders

**Key Methods:**
- `analyzeAndCreateMemories()`: Pattern detection
- `getUpcomingReminders()`: Fetch reminders
- `createCustomMemory()`: User-created reminders
- `generateProactiveSuggestions()`: Smart suggestions

**Pattern Detection:**
```
Actions → Time Analysis → Pattern Matching → Memory Creation
```

### 3. Data Models

#### User Model
```javascript
{
  id: string,
  email: string,
  phone: string,
  name: string,
  preferences: {
    timezone: string,
    notificationEmail: boolean,
    notificationSMS: boolean,
    autoApproveAfterTraining: boolean,
    trainingRounds: number
  },
  trustLevel: 'new' | 'training' | 'trusted' | 'autonomous',
  linkedAccounts: {...},
  createdAt: ISO Date,
  lastActive: ISO Date
}
```

#### Action Model
```javascript
{
  id: string,
  userId: string,
  type: string,
  status: 'pending_approval' | 'approved' | 'executing' | 'completed' | 'failed' | 'cancelled',
  input: string,
  planSteps: Array,
  executedSteps: Array,
  result: object,
  feedback: object,
  confidence: number,
  requiresApproval: boolean,
  metadata: object,
  createdAt: ISO Date,
  approvedAt: ISO Date,
  completedAt: ISO Date
}
```

#### Memory Model
```javascript
{
  id: string,
  userId: string,
  type: 'recurring_task' | 'preference' | 'learned_pattern' | 'annual_reminder',
  category: string,
  title: string,
  description: string,
  pattern: {
    interval: number,
    unit: string,
    lastOccurrence: Date
  },
  triggers: Array,
  confidence: number,
  occurrences: number,
  nextTrigger: ISO Date,
  active: boolean,
  createdAt: ISO Date,
  updatedAt: ISO Date
}
```

#### Feedback Model
```javascript
{
  id: string,
  userId: string,
  actionId: string,
  rating: 1-5,
  wasCorrect: boolean,
  comment: string,
  corrections: {
    preferredProvider: string,
    preferredTime: string,
    avoidProvider: string
  },
  mistakeType: string,
  learningPoints: Array,
  appliedToModel: boolean,
  createdAt: ISO Date
}
```

### 4. AI Agent System

#### Main Agent (`lifePilotAgent.js`)

**Responsibilities:**
- Interpret user requests
- Route to appropriate tool
- Generate natural language responses
- Coordinate multi-step actions

**OpenAI Integration:**
- Model: GPT-4 Turbo Preview
- Function calling for tool execution
- Conversational responses
- JSON mode for structured output

**Tools Registered:**
1. `schedule_dentist_appointment`
2. `cancel_subscription`
3. `dispute_credit_card_charge`

#### Tool System

**Tool Interface:**
```javascript
async function toolName(input, openai) {
  // 1. Parse input
  // 2. Use AI for matching/planning
  // 3. Execute action (mock or real)
  // 4. Return structured result
  
  return {
    success: boolean,
    message: string,
    [data]: object
  };
}
```

**Example: Schedule Dentist**
```javascript
Input: { preferredDate, preferredTime, reason }
    ↓
AI matches with available dentists
    ↓
Selects best option
    ↓
"Books" appointment (mock)
    ↓
Returns confirmation
```

## Data Flow

### Complete Action Flow

```
1. User Input
   ↓
2. Frontend → POST /api/actions/plan
   ↓
3. Backend: ConfirmationService.createActionPlan()
   ↓
4. AI generates step-by-step plan
   ↓
5. Check user trust level
   ↓
6. Create Action record (status: pending_approval)
   ↓
7. Return plan to frontend
   ↓
8. User reviews plan on /confirm page
   ↓
9. User clicks Approve
   ↓
10. Frontend → POST /api/actions/:id/approve
    ↓
11. Backend: Update action status → approved
    ↓
12. Frontend → POST /api/actions/:id/execute
    ↓
13. Backend: Execute appropriate tool
    ↓
14. Tool performs action (AI-assisted)
    ↓
15. Update action status → completed
    ↓
16. Update user training rounds
    ↓
17. Check and update trust level
    ↓
18. Return result to frontend
    ↓
19. Show completion screen
    ↓
20. Prompt for feedback
    ↓
21. User submits feedback
    ↓
22. Frontend → POST /api/feedback
    ↓
23. Backend: Store feedback
    ↓
24. Extract learning points
    ↓
25. Update user preferences
    ↓
26. Adjust trust level if needed
    ↓
27. Trigger pattern analysis (background)
    ↓
28. Create/update memories
    ↓
29. Generate future suggestions
```

### Trust Level Progression

```
New User (0 actions)
    ↓ Complete action successfully
Training (1 action)
    ↓ Continue succeeding
Training (2-4 actions)
    ↓ 5th successful action
Trusted (5 actions)
    ↓ Continue succeeding
Trusted (6-9 actions)
    ↓ 10th successful action
Autonomous (10+ actions)

[Mistakes decrease training rounds]
[Good feedback maintains/increases trust]
```

### Pattern Detection Algorithm

```javascript
1. Get user's action history (last 100)
2. Group by action type
3. For each group:
   a. Extract timestamps
   b. Calculate intervals
   c. If 2+ occurrences:
      - Calculate average interval
      - If ~365 days → Annual pattern
      - If ~30 days → Monthly pattern
      - If ~7 days → Weekly pattern
4. Create memory entry
5. Calculate next trigger (interval - 14 days)
6. Set confidence based on occurrence count
```

## API Design

### RESTful Endpoints

#### User Management
```
POST   /api/users                  Create user
GET    /api/users/:id              Get user profile
PUT    /api/users/:id              Update user
```

#### Action Management
```
POST   /api/actions/plan           Create action plan
POST   /api/actions/:id/approve    Approve action
POST   /api/actions/:id/reject     Reject action
POST   /api/actions/:id/execute    Execute action
GET    /api/actions/:id            Get action status
GET    /api/users/:id/actions      Get user's actions
```

#### Feedback
```
POST   /api/feedback                      Submit feedback
GET    /api/users/:id/preferences         Get preferences
GET    /api/users/:id/mistake-analysis    Get mistake patterns
GET    /api/users/:id/feedback-summary    Get summary
```

#### Memory & Reminders
```
POST   /api/users/:id/analyze-patterns        Analyze patterns
GET    /api/users/:id/reminders               Get reminders
GET    /api/users/:id/proactive-suggestions   Get suggestions
POST   /api/memories                          Create memory
GET    /api/users/:id/memories                Get memories
PUT    /api/memories/:id                      Update memory
```

#### Integration
```
POST   /api/users/:id/link-email      Link email
POST   /api/users/:id/link-phone      Link phone
POST   /api/users/:id/verify-phone    Verify phone
```

### Response Format

**Success:**
```json
{
  "success": true,
  "message": "Action completed",
  "data": {...}
}
```

**Error:**
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {...}
}
```

## Security Considerations

### Current Implementation
- CORS enabled for localhost
- Environment variables for secrets
- No authentication (demo mode)
- Local file storage

### Production Requirements
- [ ] Add authentication (JWT, OAuth)
- [ ] Implement rate limiting
- [ ] Add request validation
- [ ] Secure database with encryption
- [ ] HTTPS only
- [ ] API key rotation
- [ ] Audit logging
- [ ] GDPR compliance

## Performance Considerations

### Frontend
- Server-side rendering with Next.js
- Code splitting by route
- Image optimization
- CSS modules for scoped styles
- Lazy loading for heavy components

### Backend
- Async/await throughout
- Minimal dependencies
- File-based caching
- Connection pooling (when DB added)

### AI Calls
- Strategic use of GPT-4 (expensive)
- Cache common responses
- Batch operations when possible
- Fallback to GPT-3.5 for simple tasks

## Scalability

### Current Limits
- Single-server deployment
- File-based storage (not concurrent-safe)
- No caching layer
- Synchronous operations

### Scaling Strategy

**Phase 1: Basic Scale (100 users)**
- Add PostgreSQL
- Deploy on cloud (Heroku/Railway)
- Add Redis for caching

**Phase 2: Medium Scale (1K users)**
- Separate frontend/backend servers
- Add load balancer
- Queue system for AI calls (Bull)
- CDN for static assets

**Phase 3: Large Scale (10K+ users)**
- Microservices architecture
- Kubernetes deployment
- Distributed caching
- Event-driven architecture
- Message queues (RabbitMQ/Kafka)

## Testing Strategy

### Unit Tests
- Model CRUD operations
- Service logic
- Utility functions

### Integration Tests
- API endpoints
- Database operations
- AI tool execution

### E2E Tests
- User flows
- Action approval process
- Feedback submission

### Testing Tools
- Jest (unit tests)
- Supertest (API tests)
- Playwright (E2E tests)

## Monitoring & Logging

### Logging
- Winston for structured logging
- Different levels: error, warn, info, debug
- Separate files per level
- Log rotation

### Monitoring
- Error tracking (Sentry)
- Performance monitoring (New Relic)
- Uptime monitoring (UptimeRobot)
- Analytics (PostHog)

### Metrics to Track
- Action success rate
- Average response time
- AI API usage/cost
- User trust level distribution
- Feedback ratings
- Pattern detection accuracy

## Development Workflow

### Git Workflow
```
main (production)
  ↑
develop (staging)
  ↑
feature/* (feature branches)
```

### CI/CD Pipeline
1. Push to feature branch
2. Run linting
3. Run tests
4. Build frontend/backend
5. Deploy to staging
6. Manual approval
7. Deploy to production

### Code Standards
- ESLint for linting
- Prettier for formatting
- Conventional commits
- PR reviews required

## Future Architecture Improvements

### Short-term
- [ ] Add Redis caching
- [ ] Implement proper authentication
- [ ] Database migration
- [ ] Background job queue

### Medium-term
- [ ] GraphQL API
- [ ] WebSocket for real-time updates
- [ ] Microservices split
- [ ] Container orchestration

### Long-term
- [ ] Event-sourcing architecture
- [ ] CQRS pattern
- [ ] ML models for pattern detection
- [ ] Edge computing for speed

## Deployment Architecture

### Current (Development)
```
localhost:3000 (Frontend)
     ↓
localhost:3001 (Backend)
     ↓
/data/*.json (Storage)
```

### Recommended (Production)
```
CDN (Vercel/Cloudflare)
    ↓
Frontend (Vercel)
    ↓ HTTPS
Backend (Railway/Heroku)
    ↓
PostgreSQL (Supabase/RDS)
    ↓
Redis (Upstash)
```

## Cost Estimation

### Development
- $0 (local only)

### Small Production (100 users)
- Vercel (Frontend): $0 (hobby)
- Railway (Backend): $5/mo
- Supabase (Database): $0 (free tier)
- OpenAI API: $20-50/mo
- **Total: ~$30/mo**

### Medium Production (1K users)
- Vercel: $20/mo
- Railway: $20/mo
- Supabase: $25/mo
- OpenAI API: $200-500/mo
- Redis: $10/mo
- **Total: ~$300/mo**

---

**Last Updated**: November 2025
**Version**: 1.0.0
**Maintainer**: LifePilot Team

