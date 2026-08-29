import { z } from 'zod';

export const signUpSchema = z.object({
    body: z.object({
        name: z.string({ required_error: 'Name is required' })
            .trim()
            .min(2, 'Name must be at least 2 characters')
            .max(50, 'Name must not exceed 50 characters'),
        email: z.string({ required_error: 'Email is required' })
            .trim()
            .email('Please enter a valid email address')
            .toLowerCase(),
        password: z.string({ required_error: 'Password is required' })
            .min(6, 'Password must be at least 6 characters'),
    }),
});

export const signInSchema = z.object({
    body: z.object({
        email: z.string({ required_error: 'Email is required' })
            .trim()
            .email('Please enter a valid email address')
            .toLowerCase(),
        password: z.string({ required_error: 'Password is required' })
            .min(1, 'Password is required'),
    }),
});
