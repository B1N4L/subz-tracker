import { z } from 'zod';

export const updateUserSchema = z.object({
    body: z.object({
        name: z.string()
            .trim()
            .min(2, 'Name must be at least 2 characters')
            .max(50, 'Name must not exceed 50 characters')
            .optional(),
        email: z.string()
            .trim()
            .email('Please enter a valid email address')
            .toLowerCase()
            .optional(),
    }),
});
