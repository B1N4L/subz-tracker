import { z } from 'zod';

export const validate = (schema) => async (req, res, next) => {
    try {
        const parsed = await schema.parseAsync({
            body: req.body,
            query: req.query,
            params: req.params,
        });

        if (parsed.body) req.body = parsed.body;
        if (parsed.query) req.query = parsed.query;
        if (parsed.params) req.params = parsed.params;

        next();
    } catch (err) {
        if (err instanceof z.ZodError || err.name === 'ZodError' || err.issues) {
            const issues = err.issues || err.errors || [];
            const formattedErrors = issues.reduce((acc, curr) => {
                const field = curr.path.join('.').replace(/^(body|query|params)\./, '');
                if (!acc[field]) {
                    acc[field] = [];
                }
                acc[field].push(curr.message);
                return acc;
            }, {});

            return res.status(400).json({
                success: false,
                message: 'Validation failed',
                errors: formattedErrors,
            });
        }
        next(err);
    }
};
