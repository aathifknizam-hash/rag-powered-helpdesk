# SSD Project

A full-stack support platform built with Django REST API on the backend and React + Vite on the frontend. The system is designed for customer support workflows, including ticket management, knowledge base operations, admin analytics, and AI-assisted support features.

## Overview

This project combines:
- a Django backend with REST APIs, JWT-based auth, and WebSocket support
- a React frontend with role-based dashboards for customers, agents, and admins
- AI capabilities for search, recommendations, ticket classification, and diagnostics

## Key Features

- User authentication and session handling with cookie-based JWT support
- Ticket creation, tracking, assignment, updates, and resolution flows
- Knowledge base upload and document management
- AI-powered search and contextual recommendations
- Admin dashboard with analytics, audit logs, user management, and settings
- Real-time communication support for messaging and live workflows

## Tech Stack

### Backend
- Python
- Django
- Django REST Framework
- Django Channels
- JWT authentication
- SQLite by default for local development

### Frontend
- React
- Vite
- React Router
- Axios
- Tailwind-style UI components

## Project Structure

- `backend/` - Django project and API services
  - `authentication/` - login, registration, profile, JWT/cookie auth
  - `tickets/` - ticket CRUD, messages, workflows
  - `knowledge_base/` - document upload and knowledge management
  - `ai_services/` - search, embeddings, copilot, diagnostics, classification
  - `admin_panel/` - admin APIs and management endpoints
  - `core/` - project settings, URLs, ASGI config, middleware
- `frontend/` - React frontend application
  - `src/components/` - UI for customer, agent, and admin flows
  - `src/services/` - API client and service wrappers
  - `src/hooks/` - reusable hooks for auth, tickets, and AI behavior
- `archived_docs/` - older project notes and documentation

## Prerequisites

- Python 3.10+
- Node.js 18+
- npm
- pip
- (Optional) Redis if you want to use the production-style channel setup

## Environment Variables

Create a `.env` file inside the backend folder before running the server.

### Backend
- `DJANGO_SECRET_KEY` - secret key for Django
- `DJANGO_DEBUG` - set to `True` or `False`
- `DJANGO_ALLOWED_HOSTS` - comma-separated allowed hosts
- `GROQ_API_KEY` - API key for Groq-based AI features
- `GROQ_MODEL` - model name to use for AI requests
- `CHROMADB_PERSIST_DIR` - directory for ChromaDB storage
- `REDIS_URL` - optional Redis URL for channel layers in production
- `CORS_ALLOWED_ORIGINS` - optional frontend origins for CORS

### Frontend
- `VITE_API_BASE_URL` - base API URL for the frontend (defaults to `http://localhost:8000/api`)

## Backend Setup

1. Go to the backend folder:
   ```bash
   cd backend
   ```
2. Create and activate a virtual environment:
   ```bash
   python -m venv .venv
   source .venv/bin/activate
   ```
   On Windows PowerShell:
   ```powershell
   .\.venv\Scripts\Activate.ps1
   ```
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Apply migrations:
   ```bash
   python manage.py migrate
   ```
5. Create a superuser if needed:
   ```bash
   python manage.py createsuperuser
   ```
6. Run the server:
   ```bash
   python manage.py runserver
   ```

## Frontend Setup

1. Go to the frontend folder:
   ```bash
   cd frontend
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```
4. The frontend will typically run on the Vite default address (commonly `http://localhost:5173`).

## API Structure

The backend exposes routes under the following base paths:
- `/api/auth/` - authentication and profile endpoints
- `/api/tickets/` - ticket operations and ticket messaging
- `/api/knowledge_base/` - document upload and retrieval endpoints
- `/api/ai/` - AI search, copilot features, classification, diagnostics
- `/api/admin/` - admin management endpoints

## Running Tests

### Backend
```bash
python manage.py test
```

### Frontend
```bash
npm run build
npm run lint
```

## Notes

- The repository includes a root `.gitignore` so local environment files, caches, build outputs, and logs are not committed accidentally.
- The backend uses SQLite by default for local development, while production setups may use other database and Redis-backed configurations.
- Some AI features depend on external services such as Groq and ChromaDB, so those environment variables should be configured before using those modules.

## Suggested Development Workflow

1. Start the backend server.
2. Start the frontend dev server.
3. Use the login flow to access customer, agent, or admin dashboards.
4. Upload documents to the knowledge base to enable AI search and recommendations.
5. Create tickets and use AI assistance for classification or suggested resolutions.

