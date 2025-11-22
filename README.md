# LifePilot

An AI-powered personal assistant that helps you manage daily tasks like scheduling appointments, managing subscriptions, and disputing charges.

## Project Structure

```
lifepilot/
├── backend/          # Express.js backend server
├── frontend/         # Next.js frontend application
├── agents/           # AI agent logic
├── tools/            # Tool implementations
└── data/            # Mock data for development
```

## Setup Instructions

### Backend

1. Navigate to backend directory:
   ```bash
   cd backend
   ```

2. Add your API keys to `.env`:
   ```
   OPENAI_API_KEY=your_api_key_here
   PORT=3001
   ```

3. Start the backend server:
   ```bash
   node index.js
   ```

   The backend will run on http://localhost:3001

### Frontend

1. Navigate to frontend directory:
   ```bash
   cd frontend
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

   The frontend will run on http://localhost:3000

## Features

### Current Capabilities

- **Dentist Scheduling**: Find and schedule dentist appointments
- **Subscription Management**: Track and cancel subscriptions
- **Charge Disputes**: Handle suspicious transactions

### Mock Data

The project includes mock data for:
- Dentist listings (`data/dentists.json`)
- Subscription information (`data/subscriptions.json`)
- Transaction records (`data/transactions.json`)

## Development

### Backend API Endpoints

- `GET /` - Health check
- `POST /agent` - Main agent endpoint

### Tools

- `scheduleDentist.js` - Schedule dentist appointments
- `cancelSubscription.js` - Cancel subscriptions
- `disputeCharge.js` - Dispute charges

### Agent

The `lifePilotAgent.js` contains the main AI logic for processing user requests.

## GitHub Setup

To push this project to GitHub:

1. Create a new repository at https://github.com/naviraaah/lifepilot
   - Do NOT initialize with README, .gitignore, or license (the repo should be completely empty)

2. Push the code:
   ```bash
   git push -u origin main
   ```

## Next Steps

1. Add your OpenAI API key to `backend/.env`
2. Implement real tool functionality (replace mock implementations)
3. Build the frontend UI
4. Connect frontend to backend API
5. Enhance AI agent with more sophisticated logic
6. Add authentication and user management
7. Deploy to production

## License

MIT

