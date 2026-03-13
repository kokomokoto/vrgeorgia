# Backend (Express + MongoDB)

## Setup

1) Copy env

- Copy `.env.example` to `.env` and edit values.

2) Install

- `npm install`

3) Run

- `npm run dev`

## Notes

- Uploads are stored in `backend/uploads` and served at `http://localhost:5000/uploads/<file>`.
- Translation uses Google Cloud Translate only if configured. Otherwise, user content remains as-is.
