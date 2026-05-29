# Project Goal
The goal of this project is to set up the base architecture for the Enterprise Claude Skills platform, focusing on creating a robust foundation for future development.

# Architecture Summary
The platform will consist of a backend service built with Node.js and Express, a frontend admin interface built with React, and a PostgreSQL database. Redis and BullMQ will be used for caching and queue management.

# Implementation Order
1. Set up repository structure
2. Initialize memory files
3. Create backend foundation
4. Create frontend/admin foundation
5. Set up PostgreSQL
6. Set up Redis + BullMQ
7. Configure Docker Compose
8. Implement health endpoints and logging

# Main Entities/Modules
- Skill Registry
- Department Suites
- Industry Overlays
- Entitlements
- Agent Profiles
- Routing
- Approvals
- Metering
- Audit Logs
- Admin UI