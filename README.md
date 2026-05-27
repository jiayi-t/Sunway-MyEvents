# Sunway MyEvents

Event Management and Recommendation System for Sunway Campus

## Technology Stack
- **Frontend:** React.js + Vite + TypeScript
- **Backend:** Node.js + Express.js + TypeScript
- **Database:** PostgreSQL
- **Auth:** JWT

## Getting Started

### Prerequisites
- Node.js >= 18
- Docker & Docker Compose

### Setup
1. Clone the repository
2. Start the database: `docker-compose up -d`
3. Set up server environment: copy `apps/server/.env.sample` to `apps/server/.env` and fill in values
4. Install dependencies: `npm install`
5. Start development: `npm run dev`