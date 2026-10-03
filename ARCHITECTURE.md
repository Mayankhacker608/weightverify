# Architecture

## Overview

The project is structured as a connected web application with a Node.js + Express backend, MongoDB persistence, and a static HTML/CSS/JS frontend.

## Frontend architecture

- Pages are served as static HTML files in `frontend/`.
- JavaScript modules communicate with the backend via fetch and bearer JWT tokens.
- Role-based views are controlled by the API response and the user role stored in localStorage.

## Backend architecture

- Express app runs the REST API.
- Routes are grouped by domain: auth, users, instruments, applications, verifications, certificates, notifications.
- Middleware handles auth, role authorization, validation, and centralized error handling.

## Database architecture

- MongoDB stores users, instruments, applications, verification records, certificates, notifications, and audit logs.
- Mongoose models define schemas and common search indexes.

## Security architecture

- JWT access tokens used for authentication.
- Passwords hashed with bcrypt.
- CORS, helmet, rate limiting, and validation enabled.
- Sensitive routes enforce role checks.

## Certificate workflow

1. User registers instrument.
2. Application is submitted.
3. Admin reviews and schedules verification.
4. LMO/GATC performs verification.
5. Pass result generates certificate.
6. Public verification endpoint checks the certificate status.

## QR verification

- Each valid certificate receives a QR token.
- Public verification page checks certificate number against the backend.
- QR is used as a secure reference to the certificate verification route.

## Notification architecture

- In-app notifications are stored in the Notification model.
- Email notifications can be added via SMTP environment variables when configured.

## File upload architecture

- Multer stores uploaded files locally in backend/uploads.
- Uploaded file types are restricted to JPG, PNG, PDF.
- MIME and extension validation prevents unsafe file uploads.
