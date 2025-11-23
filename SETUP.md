# 🚀 LifePilot Setup Guide

Complete guide to getting LifePilot up and running on your machine.

## Prerequisites

Before you begin, ensure you have:

- **Node.js 18+** installed ([Download](https://nodejs.org/))
- **OpenAI API Key** ([Get one here](https://platform.openai.com/api-keys))
- **Terminal/Command Prompt** access
- **Git** installed (optional, for cloning)

## Quick Start (5 minutes)

### Step 1: Install Dependencies

```bash
# Install backend dependencies
cd backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

### Step 2: Configure Environment Variables

**Backend Configuration:**

Create `backend/.env`:
```bash
cd backend
echo "OPENAI_API_KEY=your_actual_api_key_here" > .env
echo "PORT=3001" >> .env
```

**Frontend Configuration:**

Create `frontend/.env.local`:
```bash
cd ../frontend
echo "NEXT_PUBLIC_API_URL=http://localhost:3001" > .env.local
```

### Step 3: Start the Services

**Terminal 1 - Start Backend:**
```bash
cd backend
npm start
```

You should see:
```
LifePilot backend running on port 3001
```

**Terminal 2 - Start Frontend:**
```bash
cd frontend
npm run dev
```

You should see:
```
▲ Next.js 16.0.3
- Local:        http://localhost:3000
```

### Step 4: Access LifePilot

Open your browser and go to:
**http://localhost:3000**

🎉 You're ready to go!

## Detailed Setup

### Option 1: Using npm scripts

Add these to your root `package.json` (if you want to manage both):

```json
{
  "scripts": {
    "install:all": "cd backend && npm install && cd ../frontend && npm install",
    "dev:backend": "cd backend && npm start",
    "dev:frontend": "cd frontend && npm run dev",
    "dev": "concurrently \"npm run dev:backend\" \"npm run dev:frontend\""
  },
  "devDependencies": {
    "concurrently": "^8.2.2"
  }
}
```

Then run:
```bash
npm install
npm run install:all
npm run dev
```

### Option 2: Using PM2 (Production)

Install PM2:
```bash
npm install -g pm2
```

Create `ecosystem.config.js`:
```javascript
module.exports = {
  apps: [
    {
      name: 'lifepilot-backend',
      cwd: './backend',
      script: 'index.js',
      env: {
        NODE_ENV: 'production',
        PORT: 3001
      }
    },
    {
      name: 'lifepilot-frontend',
      cwd: './frontend',
      script: 'npm',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
```

Start:
```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

## Troubleshooting

### Backend won't start

**Error: `OPENAI_API_KEY` is not defined**
- Make sure you created `backend/.env` file
- Check that your API key is correct
- Restart the backend

**Error: Port 3001 already in use**
```bash
# Find and kill the process
lsof -ti:3001 | xargs kill -9

# Or change the port in backend/.env
echo "PORT=3002" >> backend/.env
```

### Frontend won't start

**Error: Cannot connect to backend**
- Make sure backend is running on port 3001
- Check `frontend/.env.local` has correct URL
- Try accessing http://localhost:3001 directly

**Error: Port 3000 already in use**
```bash
# Kill the process
lsof -ti:3000 | xargs kill -9

# Or use a different port
npm run dev -- -p 3002
```

### OpenAI API Issues

**Error: 401 Unauthorized**
- Your API key is invalid or expired
- Get a new key from https://platform.openai.com/api-keys

**Error: 429 Rate Limit**
- You've exceeded your API quota
- Check your usage at https://platform.openai.com/usage
- Consider upgrading your OpenAI plan

## First Time Usage

### Create Your Profile

When you first access LifePilot, it automatically creates a demo user profile. For real usage:

1. Go to Dashboard
2. The system creates user ID: `demo_user_123`
3. Start making requests to train the system

### Test Requests

Try these to get started:

**Schedule Appointment:**
```
"Find me a dentist appointment next Tuesday afternoon"
```

**Cancel Subscription:**
```
"Cancel my gym membership"
```

**Dispute Charge:**
```
"Dispute that $127.50 charge from Unknown Online Store"
```

### Understanding Trust Levels

- **👋 New (0 actions)**: Every action requires approval
- **📚 Training (1-4 actions)**: Still requires approval, building trust
- **✅ Trusted (5-9 actions)**: High-confidence actions auto-execute
- **🤖 Autonomous (10+ actions)**: Full autonomy for trained tasks

## Development Tips

### Hot Reload

Both frontend and backend support hot reload:
- Frontend: Changes automatically refresh
- Backend: Use `nodemon` for auto-restart

Install nodemon:
```bash
cd backend
npm install -D nodemon
npm run dev  # Uses nodemon
```

### Database Location

All data is stored in JSON files:
```
/data
  ├── users.json         # User profiles
  ├── actions.json       # Action history
  ├── memories.json      # Learned patterns
  ├── feedback.json      # User feedback
  ├── dentists.json      # Mock dentist data
  ├── subscriptions.json # Mock subscription data
  └── transactions.json  # Mock transaction data
```

To reset all data:
```bash
rm data/users.json data/actions.json data/memories.json data/feedback.json
```

### API Testing

Use curl or Postman to test endpoints:

```bash
# Health check
curl http://localhost:3001/

# Get dentists
curl http://localhost:3001/api/dentists

# Create action plan
curl -X POST http://localhost:3001/api/actions/plan \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "demo_user_123",
    "actionType": "schedule_dentist_appointment",
    "input": "Find me a dentist next week"
  }'
```

## Deployment

### Heroku

```bash
# Backend
cd backend
heroku create lifepilot-backend
heroku config:set OPENAI_API_KEY=your_key
git push heroku main

# Frontend
cd ../frontend
heroku create lifepilot-frontend
heroku config:set NEXT_PUBLIC_API_URL=https://lifepilot-backend.herokuapp.com
git push heroku main
```

### Vercel (Frontend) + Railway (Backend)

**Backend on Railway:**
1. Connect your GitHub repo
2. Add environment variables
3. Deploy

**Frontend on Vercel:**
1. Import project from GitHub
2. Set `NEXT_PUBLIC_API_URL` to Railway backend URL
3. Deploy

### Docker (Coming Soon)

Docker Compose setup for easy deployment.

## Production Considerations

### Database

Replace JSON files with a real database:

**PostgreSQL:**
```bash
npm install pg
# Update models to use PostgreSQL
```

**MongoDB:**
```bash
npm install mongodb mongoose
# Update models to use Mongoose
```

**Supabase:**
```bash
npm install @supabase/supabase-js
# Update models to use Supabase client
```

### Authentication

Add real authentication:
- Auth0
- Firebase Auth
- NextAuth.js
- Clerk

### Security

- Add HTTPS in production
- Implement rate limiting
- Add request validation
- Secure API keys in environment
- Add CORS restrictions

## Support

If you encounter issues:

1. Check this guide thoroughly
2. Review error messages carefully
3. Check the GitHub Issues page
4. Ensure all dependencies are installed
5. Verify your OpenAI API key is valid

## Next Steps

Once set up:

1. ✅ Complete your first action
2. ✅ Provide feedback to train the system
3. ✅ Reach "Trusted" status (5+ actions)
4. ✅ Enable autonomous mode
5. ✅ Set up email/phone integration
6. ✅ Create custom recurring reminders

Happy automating! ✈️

