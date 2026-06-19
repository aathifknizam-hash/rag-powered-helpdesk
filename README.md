# SSD Project

This repository contains a full-stack application with a Django backend and a Vite/React frontend.

## Project Structure

- `backend/` - Django API and server-side logic
- `frontend/` - React/Vite application
- `archived_docs/` - archived documentation and notes

## Requirements

- Python 3.10+
- Node.js 18+
- pip / virtual environment
- npm

## Backend Setup

1. Navigate to the backend folder
2. Create and activate a virtual environment
3. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
4. Run migrations and start the server:
   ```bash
   python manage.py migrate
   python manage.py runserver
   ```

## Frontend Setup

1. Navigate to the frontend folder
2. Install dependencies:
   ```bash
   npm install
   ```
3. Start the development server:
   ```bash
   npm run dev
   ```

## Notes

- Use the root `.gitignore` to avoid committing local environment and build artifacts.
- Check the documentation folders for additional setup and implementation notes.
