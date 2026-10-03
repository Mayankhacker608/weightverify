# Deployment Guide

## Prerequisites

- Node.js 18+
- MongoDB Atlas or local MongoDB
- Domain or reverse proxy for production hosting
- Optional SMTP account for email notifications

## Environment configuration

Create a `.env` file using `.env.example` with the following required values:

```env
PORT=5000
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/e-metrology
JWT_SECRET=replace-with-a-secure-secret
FRONTEND_URL=https://weightverify.onrender.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=user@example.com
SMTP_PASSWORD=secret
```

## Production checklist

- Set strong JWT secret
- Enable HTTPS
- Use MongoDB Atlas or managed MongoDB
- Configure CORS for production domain
- Restrict upload paths and file sizes
- Add proper rate limits and logging
- Configure backup strategy for MongoDB

## Sample deployment on Render or Railway

1. Add environment variables.
2. Set build command: `npm install`
3. Set start command: `node backend/server.js`
4. Ensure database connection string is valid.
5. Configure health check endpoint: `/health`

## Frontend hosting

The current prototype uses static HTML pages and can be served from:

- Netlify
- Vercel
- GitHub Pages for demo-only use
- Nginx or Apache behind a reverse proxy

## Monitoring

- Monitor MongoDB connection health
- Log API errors
- Watch expiry and certificate generation workflows
- Use uptime checks for verification URLs
