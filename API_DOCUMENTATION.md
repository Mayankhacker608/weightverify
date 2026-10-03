# API Documentation

## Base URL

`http://localhost:5000`

## Authentication

All protected routes require a Bearer token in the Authorization header.

### Register

- Method: POST
- Endpoint: /api/auth/register
- Body:
  - name
  - email
  - phone
  - password
  - organization
  - address
  - state
  - district
  - role (optional)

### Login

- Method: POST
- Endpoint: /api/auth/login
- Body:
  - email
  - password

### Me

- Method: GET
- Endpoint: /api/auth/me

## Instruments

### List instruments

- Method: GET
- Endpoint: /api/instruments

### Create instrument

- Method: POST
- Endpoint: /api/instruments

### Get one instrument

- Method: GET
- Endpoint: /api/instruments/:id

### Update instrument

- Method: PUT
- Endpoint: /api/instruments/:id

## Applications

### Create application

- Method: POST
- Endpoint: /api/applications

### List applications

- Method: GET
- Endpoint: /api/applications

### Get application

- Method: GET
- Endpoint: /api/applications/:id

### Update application

- Method: PUT
- Endpoint: /api/applications/:id

## Verification

### Submit verification

- Method: POST
- Endpoint: /api/verifications

### Get verification

- Method: GET
- Endpoint: /api/verifications/:id

### Generate certificate

- Method: POST
- Endpoint: /api/verifications/generate-certificate

## Certificates

### Fetch certificate

- Method: GET
- Endpoint: /api/certificates/:id

### Public verification

- Method: GET
- Endpoint: /api/certificates/verify/:certificateNumber

## Notifications

### List notifications

- Method: GET
- Endpoint: /api/notifications

### Mark read

- Method: PUT
- Endpoint: /api/notifications/:id/read

## Notes

- All routes enforce authentication and role checks as needed.
- Error responses are returned as JSON with a clear message field.
