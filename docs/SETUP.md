# Setup Guide

## Prerequisites
- Node.js 18+
- PostgreSQL 13+
- Redis 6+
- Docker (optional, for compose)

## Environment
Copy .env.example to .env and fill values.

## Install & Run
- Backend: cd backend && npm install && npm run migrate && npm start
- Frontend: cd frontend && npm install && npm start

## Docker Compose
- docker-compose up --build
