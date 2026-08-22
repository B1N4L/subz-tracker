import { z } from 'zod';

export const createSubscriptionSchema = z.object({
    body: z.object({
        name: z.string({ required_error: 'Subscription name is required' })
            .trim()
            .min(2, 'Name must be at least 2 characters')
            .max(50, 'Name must not exceed 50 characters'),
        price: z.number({ required_error: 'Subscription price is required' })
            .min(0, 'Price must be a positive number')
            .max(1000000, 'Price cannot exceed 1,000,000'),
        currency: z.enum(['EUR', 'GBP', 'USD', 'LKR']).default('USD').optional(),
        frequency: z.enum(['daily', 'weekly', 'monthly', 'yearly'], {
            errorMap: () => ({ message: 'Frequency must be daily, weekly, monthly, or yearly' }),
        }),
        category: z.enum(['sports', 'news', 'entertainment', 'lifestyle', 'technology', 'finance', 'political', 'other'], {
            errorMap: () => ({ message: 'Invalid category selected' }),
        }),
        paymentMethod: z.string({ required_error: 'Payment method is required' })
            .trim()
            .min(2, 'Payment method must be at least 2 characters')
            .max(20, 'Payment method must not exceed 20 characters'),
        status: z.enum(['active', 'canceled', 'expired']).default('active').optional(),
        startDate: z.string({ required_error: 'Start date is required' })
            .or(z.date())
            .pipe(z.coerce.date()),
        renewalDate: z.string().or(z.date()).pipe(z.coerce.date()).optional(),
    }),
});

export const updateSubscriptionSchema = z.object({
    body: createSubscriptionSchema.shape.body.partial(),
});
