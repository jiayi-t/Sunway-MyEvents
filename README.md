# Sunway MyEvents

Event Management and Recommendation System for Sunway Campus

## Technology Stack
- **Frontend:** React.js + Vite + TypeScript
- **Backend:** Node.js + Express.js + TypeScript
- **Database:** PostgreSQL (Docker)
- **Auth:** JWT

## Getting Started

### Prerequisites
- Node.js >= 18
- Docker & Docker Compose

### Setup
1. Clone the repository
2. Set up environment variables:
   - Copy `.env.example` to `.env` and fill in database credentials
   - Copy `apps/server/.env.example` to `apps/server/.env` and fill in values
3. Start the database: `docker-compose up -d`
4. Install dependencies: `npm install`
5. Start development: `npm run dev`

### Development URLs
- Frontend: http://localhost:5173
- Backend: http://localhost:3001
- API Health Check: http://localhost:3001/api/health

### Test Accounts
| Role | Student ID | Password |
|------|-----------|----------|
| Student | 22055313 | sunway123 |
| Organizer | ssa | sunway123 |