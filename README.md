# VR Georgia (MVP)

Professional real-estate MVP for Georgia (buy/rent/mortgage) with:
- Next.js + Tailwind frontend
- Express + MongoDB backend
- JWT auth
- Property upload (with multi-photo upload)
- Map + filters + listing cards
- Multi-language switcher (Georgian default). User-generated content translation is optional via Google Cloud Translate.

## Prereqs

- Node.js 18+ (recommended)
- MongoDB running locally

## Backend

```powershell
cd c:\Users\ATA\Desktop\vrgeorgia\vrgeorgia1\backend
Copy-Item .env.example .env
npm install
npm run seed
npm run dev
```

API: `http://localhost:5000/api/health`

Seed user: `demo@vrgeorgia.local` / `password123`

## Frontend

```powershell
cd c:\Users\ATA\Desktop\vrgeorgia\vrgeorgia1\frontend
Copy-Item .env.local.example .env.local
npm install
npm run dev
```

Open: `http://localhost:3000`

## Notes

- Photos are stored locally in `backend/uploads` and served by backend.
- If you want real translations, configure Google Cloud Translate in `backend/.env`.
