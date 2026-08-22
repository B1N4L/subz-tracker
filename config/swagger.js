import swaggerJSDoc from 'swagger-jsdoc';
import { PORT, SERVER_URL } from './env.js';

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'SubzTracker API',
            version: '1.0.0',
            description: 'Subscription Management & Reminder REST API with JWT Auth, Arcjet Protection, and Upstash Workflows',
            contact: {
                name: 'SubzTracker Support',
            },
        },
        servers: [
            {
                url: SERVER_URL || `http://localhost:${PORT || 5500}`,
                description: 'Development Server',
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Enter your JWT token in the format: Bearer <token>',
                },
            },
            schemas: {
                User: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', example: '65a123456789abcdef012345' },
                        name: { type: 'string', example: 'John Doe' },
                        email: { type: 'string', example: 'john@example.com' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                Subscription: {
                    type: 'object',
                    properties: {
                        _id: { type: 'string', example: '65a987654321fedcba543210' },
                        name: { type: 'string', example: 'Netflix Premium' },
                        price: { type: 'number', example: 15.99 },
                        currency: { type: 'string', enum: ['EUR', 'GBP', 'USD', 'LKR'], example: 'USD' },
                        frequency: { type: 'string', enum: ['daily', 'weekly', 'monthly', 'yearly'], example: 'monthly' },
                        category: { type: 'string', enum: ['sports', 'news', 'entertainment', 'lifestyle', 'technology', 'finance', 'political', 'other'], example: 'entertainment' },
                        paymentMethod: { type: 'string', example: 'Credit Card' },
                        status: { type: 'string', enum: ['active', 'canceled', 'expired'], example: 'active' },
                        startDate: { type: 'string', format: 'date-time' },
                        renewalDate: { type: 'string', format: 'date-time' },
                        user: { type: 'string', example: '65a123456789abcdef012345' },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        success: { type: 'boolean', example: false },
                        message: { type: 'string', example: 'Error message description' },
                        errors: { type: 'object', nullable: true },
                    },
                },
            },
        },
        paths: {
            '/api/v1/auth/sign-up': {
                post: {
                    summary: 'Register a new user',
                    tags: ['Authentication'],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['name', 'email', 'password'],
                                    properties: {
                                        name: { type: 'string', example: 'John Doe' },
                                        email: { type: 'string', example: 'john@example.com' },
                                        password: { type: 'string', example: 'Password123!' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        201: { description: 'User created successfully' },
                        400: { description: 'Validation error' },
                        409: { description: 'User already exists' },
                    },
                },
            },
            '/api/v1/auth/sign-in': {
                post: {
                    summary: 'Log in an existing user',
                    tags: ['Authentication'],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['email', 'password'],
                                    properties: {
                                        email: { type: 'string', example: 'john@example.com' },
                                        password: { type: 'string', example: 'Password123!' },
                                    },
                                },
                            },
                        },
                    },
                    responses: {
                        200: { description: 'User logged in successfully' },
                        401: { description: 'Invalid password' },
                        404: { description: 'User not found' },
                    },
                },
            },
            '/api/v1/auth/sign-out': {
                post: {
                    summary: 'Sign out user and clear auth cookie',
                    tags: ['Authentication'],
                    responses: {
                        200: { description: 'User logged out successfully' },
                    },
                },
            },
            '/api/v1/subscription': {
                get: {
                    summary: 'Get all subscriptions for authenticated user',
                    tags: ['Subscriptions'],
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'category', in: 'query', schema: { type: 'string' } },
                        { name: 'status', in: 'query', schema: { type: 'string' } },
                    ],
                    responses: { 200: { description: 'Success' }, 401: { description: 'Unauthorized' } },
                },
                post: {
                    summary: 'Create a new subscription',
                    tags: ['Subscriptions'],
                    security: [{ bearerAuth: [] }],
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: {
                                    type: 'object',
                                    required: ['name', 'price', 'frequency', 'category', 'paymentMethod', 'startDate'],
                                    properties: {
                                        name: { type: 'string', example: 'Spotify' },
                                        price: { type: 'number', example: 9.99 },
                                        currency: { type: 'string', example: 'USD' },
                                        frequency: { type: 'string', example: 'monthly' },
                                        category: { type: 'string', example: 'entertainment' },
                                        paymentMethod: { type: 'string', example: 'PayPal' },
                                        startDate: { type: 'string', format: 'date', example: '2026-08-01' },
                                    },
                                },
                            },
                        },
                    },
                    responses: { 201: { description: 'Created' }, 400: { description: 'Validation Error' } },
                },
            },
            '/api/v1/subscription/upcoming-renewals': {
                get: {
                    summary: 'Get upcoming subscription renewals',
                    tags: ['Subscriptions'],
                    security: [{ bearerAuth: [] }],
                    parameters: [
                        { name: 'days', in: 'query', schema: { type: 'integer', default: 7 } },
                    ],
                    responses: { 200: { description: 'Success' } },
                },
            },
            '/api/v1/subscription/{id}': {
                get: {
                    summary: 'Get subscription by ID',
                    tags: ['Subscriptions'],
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'Success' }, 404: { description: 'Not Found' } },
                },
                put: {
                    summary: 'Update subscription by ID',
                    tags: ['Subscriptions'],
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'Updated' } },
                },
                delete: {
                    summary: 'Delete subscription by ID',
                    tags: ['Subscriptions'],
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'Deleted' } },
                },
            },
            '/api/v1/subscription/{id}/cancel': {
                put: {
                    summary: 'Cancel a subscription',
                    tags: ['Subscriptions'],
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'Canceled' } },
                },
            },
            '/api/v1/user': {
                get: {
                    summary: 'Get all users',
                    tags: ['Users'],
                    security: [{ bearerAuth: [] }],
                    responses: { 200: { description: 'Success' } },
                },
            },
            '/api/v1/user/{id}': {
                get: {
                    summary: 'Get user by ID',
                    tags: ['Users'],
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'Success' } },
                },
                put: {
                    summary: 'Update user profile',
                    tags: ['Users'],
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'Updated' } },
                },
                delete: {
                    summary: 'Delete user account',
                    tags: ['Users'],
                    security: [{ bearerAuth: [] }],
                    parameters: [{ name: 'id', in: 'path', required: true, schema: { type: 'string' } }],
                    responses: { 200: { description: 'Deleted' } },
                },
            },
        },
    },
    apis: [],
};

const swaggerSpec = swaggerJSDoc(options);
export default swaggerSpec;
