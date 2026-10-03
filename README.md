# e-Metrology

A prototype digital verification and certification platform for weighing and measuring instruments.

## Overview

This application demonstrates the full lifecycle of legal metrology verification:

- user registration and profile management
- instrument registration
- application submission
- admin review and scheduling
- LMO/GATC assignment and field verification
- certificate generation and QR verification
- expiry tracking and re-verification reminders
- dashboards and reports

## Tech stack

- Frontend: HTML5, Tailwind CSS, Vanilla JavaScript, Chart.js
- Backend: Node.js, Express.js, JWT, Mongoose
- Database: MongoDB Atlas or local MongoDB
- File handling: Multer
- Certificate generation: PDFKit, QRCode
- Notifications: Nodemailer (optional), in-app notifications

## Folder structure

- backend/
- frontend/
- .env.example
- README.md
- API_DOCUMENTATION.md
- ARCHITECTURE.md
- DEPLOYMENT.md

## Local setup

1. Install Node.js 18+
2. In the project root, copy .env.example to .env and update values.
3. In the backend directory, install dependencies with:

```bash
npm install
```

4. Start the backend:

```bash
cd backend
node server.js
```

5. Open the app in a browser at http://localhost:5000.

The backend serves the static frontend files and the public verification page from the same origin to keep local development simple.

## Environment variables

```env
PORT=5000
MONGO_URI=mongodb+srv://...
JWT_SECRET=your-jwt-secret
FRONTEND_URL=http://localhost:3000
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your-smtp-user
SMTP_PASSWORD=your-smtp-password
```

## Seed data

The seed command deletes existing records. It is disabled unless explicitly enabled and accepts only a local database with `demo` or `test` in its name. Configure unique local-only `DEMO_ADMIN_PASSWORD`, `DEMO_LMO_PASSWORD`, `DEMO_GATC_PASSWORD`, and `DEMO_USER_PASSWORD` values (each at least 12 characters), then opt in explicitly:

```bash
cd backend
DEMO_SEED_CONFIRM=I_UNDERSTAND_THIS_RESETS_LOCAL_DEMO_DATA
node scripts/seedDemoData.js
```

Do not run the destructive seed against Atlas or production data.

## Testing

```bash
cd backend
npm test
```

## API overview

- POST /api/auth/register
- POST /api/auth/login
- GET /api/auth/me
- GET /api/instruments
- POST /api/instruments
- GET /api/applications
- POST /api/applications
- POST /api/verifications
- GET /api/certificates/verify/:certificateNumber

## Known limitations

- This is a prototype and not a government-issued certificate.
- PDF generation and file uploads are functional for local demo use.
- Some optional notifications and reporting can be extended for production deployment.
