import { z } from "zod";

export const createAccountSchema = z.object({
    body: z
        .object({
            serviceName: z
                .string({ required_error: "Service name is required" })
                .trim()
                .min(1, "Service name cannot be empty")
                .max(100, "Service name must not exceed 100 characters"),
            username: z
                .string()
                .trim()
                .max(100, "Username must not exceed 100 characters")
                .optional()
                .default(""),
            website: z
                .string()
                .trim()
                .max(255, "Website URL must not exceed 255 characters")
                .optional()
                .default(""),
            category: z
                .enum([
                    "streaming",
                    "software",
                    "gaming",
                    "finance",
                    "social",
                    "utilities",
                    "productivity",
                    "cloud",
                    "other",
                ], {
                    errorMap: () => ({
                        message: "Invalid category. Must be one of: streaming, software, gaming, finance, social, utilities, productivity, cloud, other",
                    }),
                })
                .optional()
                .default("other"),
            tags: z
                .array(
                    z
                        .string()
                        .trim()
                        .toLowerCase()
                        .min(1, "Tag cannot be empty")
                        .max(50, "Tag must not exceed 50 characters")
                )
                .optional()
                .default([]),
            notes: z
                .string()
                .trim()
                .max(1000, "Notes must not exceed 1000 characters")
                .optional()
                .default(""),
        })
        .strict({ message: "Unexpected field provided in request body" }),
});

export const updateAccountSchema = z.object({
    body: z
        .object({
            serviceName: z
                .string()
                .trim()
                .min(1, "Service name cannot be empty")
                .max(100, "Service name must not exceed 100 characters")
                .optional(),
            username: z
                .string()
                .trim()
                .max(100, "Username must not exceed 100 characters")
                .optional(),
            website: z
                .string()
                .trim()
                .max(255, "Website URL must not exceed 255 characters")
                .optional(),
            category: z
                .enum([
                    "streaming",
                    "software",
                    "gaming",
                    "finance",
                    "social",
                    "utilities",
                    "productivity",
                    "cloud",
                    "other",
                ])
                .optional(),
            tags: z
                .array(
                    z
                        .string()
                        .trim()
                        .toLowerCase()
                        .min(1, "Tag cannot be empty")
                        .max(50, "Tag must not exceed 50 characters")
                )
                .optional(),
            notes: z
                .string()
                .trim()
                .max(1000, "Notes must not exceed 1000 characters")
                .optional(),
        })
        .strict({ message: "Unexpected field provided in request body" }),
});

export const accountParamsSchema = z.object({
    params: z.object({
        id: z
            .string()
            .regex(/^[0-9a-fA-F]{24}$/, "Invalid Account ID format"),
    }),
});
