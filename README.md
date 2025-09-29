
# Aramco Review Platform

A full-stack web application for Aramco station reviews and admin CRM.

## Structure
- `client/` - React frontend
- `server/` - Express backend

## Prerequisites
- Node.js (v18+ recommended)
- MongoDB (local or cloud)

## Setup

### 1. Backend (server)

```
cd server
cp .env.example .env   # Edit .env with your MongoDB URI and secrets
npm install
npm run dev            # or npm start
```

### 2. Frontend (client)

```
cd client
npm install
npm start
```

The frontend will run on http://localhost:3000 and the backend on http://localhost:5000 by default.

## Usage

- Users can select a station by GPS or QR code, submit reviews, and earn rewards.
- Admins can log in and access the dashboard at `/admin/dashboard` for analytics, review moderation, and coupon management.

## Environment Variables

See `server/.env.example` for required backend environment variables.

## Project Features

- GPS/QR-based station selection
- Review submission (star rating, comments)
- Authentication (email/phone)
- Reward system (coupon on every 5th review)
- Anti-cheat (one review per station per day, GPS check, velocity monitoring)
- Admin dashboard (analytics, review moderation, coupon management, audit trail)

## License

This project is for demonstration purposes only.
