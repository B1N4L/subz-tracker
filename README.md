# SubMgr

SubMgr is a Node.js/Express backend for subscription management with authentication, user/account access, subscription creation, and scheduled renewal reminder workflows.

## Technical Overview

- Runtime: Node.js with ES modules (`"type": "module"`)
- API framework: Express
- Database: MongoDB with Mongoose
- Auth: JWT bearer tokens
- Request protection: Arcjet (`shield`, bot detection, token-bucket rate limiting)
- Background orchestration: Upstash Workflow
- Email delivery: Nodemailer (Gmail transporter)

## Architecture

- `app.js` wires middleware, route groups, error handling, and server startup.
- `controllers/` contains request handlers for auth, users, subscriptions, and workflows.
- `models/` defines Mongoose schemas (`User`, `Subscription`).
- `middlewares/` handles auth, Arcjet protection, and centralized error responses.
- `config/` holds env loading, Arcjet setup, Upstash client, and mail transporter.
- `utils/` contains email template and send utilities.

## Setup

### 1) Install dependencies

```powershell
npm install
```

### 2) Configure environment

The app loads env from:

- `.env.development.local` when `NODE_ENV` is not set
- `.env.<NODE_ENV>.local` otherwise

Required variables (from `config/env.js`):

- `PORT`
- `SERVER_URL`
- `NODE_ENV`
- `DB_URI`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `ARCJET_KEY`
- `ARCJET_ENV`
- `QSTASH_URL`
- `QSTASH_TOKEN`
- `EMAIL_PASSWORD`

### 3) Run the API

```powershell
npm run dev
```

Production mode:

```powershell
npm start
```

## API Surface

Base path: `/api/v1`

Auth-protected endpoints require:

- `Authorization: Bearer <token>`

### Auth APIs

#### `POST /api/v1/auth/sign-up`

Request:

```json
{
  "name": "Alex Doe",
  "email": "alex@example.com",
  "password": "securePass123"
}
```

Success response (`201`):

```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "token": "<jwt>",
    "user": {
      "_id": "<userId>",
      "name": "Alex Doe",
      "email": "alex@example.com"
    }
  }
}
```

#### `POST /api/v1/auth/sign-in`

Request:

```json
{
  "email": "alex@example.com",
  "password": "securePass123"
}
```

Success response (`201`):

```json
{
  "success": true,
  "message": "User logged in successfully",
  "data": {
    "token": "<jwt>",
    "user": {
      "_id": "<userId>",
      "name": "Alex Doe",
      "email": "alex@example.com"
    }
  }
}
```

### User APIs

#### `GET /api/v1/user/`

Success response (`200`):

```json
{
  "success": true,
  "data": [
    {
      "_id": "<userId>",
      "name": "Alex Doe",
      "email": "alex@example.com"
    }
  ]
}
```

#### `GET /api/v1/user/:id` (auth required)

Success response (`200`):

```json
{
  "success": true,
  "data": {
    "_id": "<userId>",
    "name": "Alex Doe",
    "email": "alex@example.com"
  }
}
```

#### `POST /api/v1/user/` (implemented response stub)

Success response (`200`):

```json
{
  "title": "CREATE new user"
}
```

#### `PUT /api/v1/user/:id` (implemented response stub)

Success response (`200`):

```json
{
  "title": "UPDATE user"
}
```

#### `DELETE /api/v1/user/:id` (implemented response stub)

Success response (`200`):

```json
{
  "title": "DELETE user"
}
```

### Subscription APIs

#### `GET /api/v1/subscription/` (implemented response stub)

Success response (`200`):

```json
{
  "title": "GET all subscriptions"
}
```

#### `GET /api/v1/subscription/:id` (implemented response stub)

Success response (`200`):

```json
{
  "title": "GET subscription by Id  "
}
```

#### `POST /api/v1/subscription/` (auth required)

Request:

```json
{
  "name": "Netflix",
  "price": 15.99,
  "currency": "USD",
  "frequency": "monthly",
  "category": "entertainment",
  "paymentMethod": "credit card",
  "startDate": "2026-04-01T00:00:00.000Z"
}
```

Success response (`201`):

```json
{
  "status": "success",
  "data": {
    "subscription": {
      "_id": "<subscriptionId>",
      "name": "Netflix",
      "user": "<userId>",
      "status": "active"
    },
    "workflowRunId": "<upstashWorkflowRunId>"
  }
}
```

#### `PUT /api/v1/subscription/:id` (implemented response stub)

Success response (`200`):

```json
{
  "title": "UPDATE subscription"
}
```

#### `DELETE /api/v1/subscription/:id` (implemented response stub)

Success response (`200`):

```json
{
  "title": "DELETE subscription"
}
```

#### `GET /api/v1/subscription/user/:id` (auth required)

Success response (`200`):

```json
{
  "status": "success",
  "data": [
    {
      "_id": "<subscriptionId>",
      "name": "Netflix",
      "user": "<userId>",
      "status": "active"
    }
  ]
}
```

#### `PUT /api/v1/subscription/:id/cancel` (implemented response stub)

Success response (`200`):

```json
{
  "title": "CANCEL subscription"
}
```

#### `GET /api/v1/subscription/upcoming-renewals` (implemented response stub)

Success response (`200`):

```json
{
  "title": "GET upcoming renewals"
}
```

## Background Workflows

### Trigger path

- Internal workflow endpoint: `POST /api/v1/workflow/subscription/reminder`
- This endpoint is intended to be triggered by Upstash Workflow.

### Upstash trigger linkage

When `POST /api/v1/subscription/` succeeds in `createSubscription`, the API calls `workflowClient.trigger(...)` with:

- URL: `${SERVER_URL}/api/v1/workflow/subscription/reminder`
- Body:

```json
{
  "subscriptionId": "<subscriptionId>"
}
```

- Returned value includes `workflowRunId`, which is sent back in the create-subscription response.

### Reminder cadence

- Reminder schedule is fixed at: `7`, `5`, `2`, `1` days before renewal.

### Workflow execution stages

1. `fetchSubscription`: Loads subscription + user (`name`, `email`) by ID.
2. Date guard: Stops if missing, inactive, or already past renewal date.
3. `sleepUntilReminder`: Waits until each reminder date (`renewalDate - N days`).
4. `triggerReminder`: Sends reminder email for each eligible stage.

## Security and Error Handling

- Arcjet middleware runs on incoming requests and can block rate-limited/suspicious traffic.
- JWT auth middleware validates bearer tokens and injects `req.user`.
- Central error middleware normalizes Mongoose validation/cast/duplicate-key errors.

## Current Implementation Status

Implemented business logic:

- `signUp`, `signIn`
- `getUsers`, `getUser`
- `createSubscription`, `getSubscriptionsByUser`
- Workflow reminder orchestration and email trigger stages

Implemented response stubs (route returns static success payload):

- User: `POST /`, `PUT /:id`, `DELETE /:id`
- Subscription: `GET /`, `GET /:id`, `PUT /:id`, `DELETE /:id`, `PUT /:id/cancel`, `GET /upcoming-renewals`

Partially implemented / pending:

- `signOut` controller
- `updateSubscription` controller logic

