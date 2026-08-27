# SubzTracker (SubMgr)

SubzTracker is a Node.js/Express backend for subscription tracking with JWT authentication, user management, full subscription lifecycle CRUD, automated renewal reminder workflows via Upstash & Nodemailer, Zod payload validation, Winston unified logging, and interactive Swagger UI documentation.

## Technical Overview

- **Runtime**: Node.js with ES modules (`"type": "module"`)
- **API Framework**: Express
- **Database & ODM**: MongoDB with Mongoose
- **Authentication**: JWT bearer tokens (`jsonwebtoken`) + `bcryptjs`
- **Validation**: Zod schema validation
- **Logging**: Winston (application & HTTP access logging with sensitive data redaction)
- **API Documentation**: Swagger UI / OpenAPI 3.0 at `/api-docs`
- **Request Protection**: Arcjet (`shield`, bot detection, token-bucket rate limiting)
- **Background Orchestration**: Upstash Workflow (`@upstash/workflow`)
- **Email Delivery**: Nodemailer (Gmail transporter)

## Architecture

- `app.js`: Wires middleware, HTTP access logger, route groups, Swagger UI, error handling, and server startup.
- `config/`: Holds environment configuration (`env.js`), Winston logger (`logger.js`), Swagger definition (`swagger.js`), Arcjet (`arcjet.js`), Upstash (`upstash.js`), and Nodemailer (`nodemailer.js`).
- `controllers/`: Request handlers for authentication, users, subscriptions, and workflows.
- `models/`: Mongoose schemas (`User`, `Subscription`).
- `middlewares/`: JWT authorization (`auth.middleware.js`), Winston HTTP access logger (`httpLogger.middleware.js`), Zod request validator (`validation.middleware.js`), Arcjet bot/rate limit protection (`arcjet.middleware.js`), and centralized error responses (`error.middleware.js`).
- `schemas/`: Zod request validation schemas (`auth.schema.js`, `subscription.schema.js`, `user.schema.js`).
- `utils/`: Email templates and dispatch helpers.

---

## Setup & Configuration

### 1) Install Dependencies

```powershell
npm install
```

### 2) Environment Configuration

The app loads environment variables from:
- `.env.development.local` when `NODE_ENV` is not set or set to `development`
- `.env.<NODE_ENV>.local` otherwise

Required variables (defined in `config/env.js`):

```dotenv
PORT=5500
SERVER_URL="http://localhost:5500"
NODE_ENV="development"
DB_URI="mongodb+srv://..."
JWT_SECRET="your_jwt_secret"
JWT_EXPIRES_IN="10d"
ARCJET_KEY="ajkey_..."
ARCJET_ENV="development"
QSTASH_URL="http://127.0.0.1:8080"
QSTASH_TOKEN="..."
EMAIL_USER="your-email@gmail.com"
EMAIL_PASSWORD="your-app-password"
LOG_LEVEL="debug" # optional: debug, info, warn, error, http
```

### 3) Run the API

Development mode (with nodemon):
```powershell
npm run dev
```

Production mode:
```powershell
npm start
```

---

## Logging with Winston

Winston is the unified logging solution for both **application logs** and **HTTP request/access logs**, replacing Morgan and ad-hoc console statements.

### Development vs. Production Behavior

| Feature | Development Mode (`NODE_ENV=development`) | Production Mode (`NODE_ENV=production`) |
| :--- | :--- | :--- |
| **Output Format** | Human-readable, colorized terminal output with timestamp | Structured JSON format for log aggregators |
| **Default Log Level** | `debug` (verbose) | `info` (clean and concise) |
| **Error Stacks** | Printed directly in console with full stack trace | Serialized into structured JSON `stack` property |
| **Transports** | Console (`stdout` / `stderr`) | Console (`stdout`) + `logs/error.log` + `logs/combined.log` |

### Available Log Levels

Winston uses standard npm logging levels (ordered by severity):
- `error` (0): Critical failures, database errors, unhandled exceptions
- `warn` (1): Suspicious requests, rate-limits, workflow warning fallbacks
- `info` (2): Server lifecycle events, database connections, email dispatches
- `http` (3): Incoming HTTP access logs with duration, status, IP, and method
- `verbose` (4): Detailed step execution
- `debug` (5): Arcjet decision conclusion details, diagnostic data

To override the default level in any environment, set the `LOG_LEVEL` environment variable:
```dotenv
LOG_LEVEL=info
```

### HTTP Request / Access Logging

The `httpLoggerMiddleware` captures all incoming Express requests upon response completion (`res.on('finish')`):
- **Method & Path**: `GET /api/v1/subscription`
- **Status Code**: `200`, `401`, `500`, etc. (Status >= 500 logs as `error`, >= 400 logs as `warn`, others as `http`)
- **Duration**: Response time in milliseconds (e.g., `14.25ms`)
- **Metadata**: Client IP address and User-Agent
- **No duplicates**: Emitted exactly once per request cycle

### Sensitive Data Redaction

The logging system automatically redacts sensitive data from metadata and request logs. Any key containing:
- `password`, `pass`, `token`, `jwt`, `secret`, `authorization`, `cookie`, `cookies`, `apiKey`, `creditCard`, `cvv`
is masked as `[REDACTED]` to prevent credential leaks.

### How to Use the Logger in Application Modules

Import the centralized logger instance:

```javascript
import logger from './config/logger.js';

// Logging messages
logger.info('Subscription created', { subscriptionId: sub._id, user: req.user._id });
logger.debug('Diagnostic info', { details: 'step 1 finished' });
logger.warn('Resource nearing quota', { usage: 95 });
logger.error('Failed to process payment', { error: err.message, stack: err.stack });
```

---

## API Documentation (Swagger UI)

Interactive Swagger UI documentation is available at:
👉 **`http://localhost:5500/api-docs`**

Use Swagger UI to test endpoints, supply Bearer tokens via the **Authorize** button, and inspect schemas.

---

## API Surface

Base path: `/api/v1`

### Authentication (`/api/v1/auth`)
- `POST /sign-up`: Register new user (validated with Zod, returns JWT, password stripped)
- `POST /sign-in`: Authenticate user (validated with Zod, returns JWT, password stripped)
- `POST /sign-out`: Clears auth cookies and ends session

### Subscriptions (`/api/v1/subscription`) - Protected
- `POST /`: Create subscription (triggers Upstash renewal reminder workflow)
- `GET /`: List all subscriptions for authenticated user (supports `?category=` and `?status=` filters)
- `GET /:id`: Get subscription by ID (with ownership check)
- `PUT /:id`: Update subscription details
- `PUT /:id/cancel`: Cancel subscription (`status = 'canceled'`)
- `GET /upcoming-renewals`: Get subscriptions renewing in next $N$ days (`?days=7`)
- `DELETE /:id`: Delete subscription

### Accounts & Credentials (`/api/v1/account`) - Protected
- `POST /`: Create external service account (e.g. Netflix, GitHub) with optional AES-256-GCM encrypted password
- `GET /`: List all service accounts for authenticated user (`?category=`, `?tag=`, `?search=`, `?page=`, `?limit=`)
- `GET /:id`: Get account metadata (passwords and encrypted credentials strictly omitted)
- `PUT /:id`: Update account details or update/remove password (`password: null` clears stored credential)
- `PATCH /:id`: Partial account update
- `DELETE /:id`: Delete account (safely unlinks any referenced subscriptions)
- `POST /:id/reveal-password`: Securely decrypt and reveal account password in plaintext (Owner only, IDOR-protected)
- `GET /:id/password`: Alias for password revelation (Owner only)

### Users (`/api/v1/user`) - Protected
- `GET /`: List all users (passwords omitted)
- `GET /:id`: Get user profile by ID
- `PUT /:id`: Update user profile (with ownership check)
- `DELETE /:id`: Delete user account and all associated subscriptions

### Workflows (`/api/v1/workflow`)
- `POST /subscription/reminder`: Upstash workflow endpoint for scheduled 7, 5, 2, and 1-day email reminders.
