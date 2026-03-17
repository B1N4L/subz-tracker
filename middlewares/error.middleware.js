// err: information that happened before the request
// next: what happens after when you're ready to proceed to the next step
const errorMiddleware = (err, req, res, next) => {
    try {
        console.error(err);

        let statusCode = err.statusCode || 500;
        let message = err.message || "Internal server error";
        let errors = null;

        // Mongoose bad ObjectId
        if (err.name === "CastError") {
            statusCode = 404;
            message = "Resource not found";
        }

        // Mongoose duplicate key
        if (err.code === 11000) {
            statusCode = 400;
            const field = Object.keys(err.keyValue || {})[0] || "field";
            message = `${field} already exists`;
            errors = {
                [field]: [`${field} already exists`],
            };
        }

        // Mongoose validation error
        if (err.name === "ValidationError") {
            statusCode = 400;
            message = "Validation failed";

            errors = Object.values(err.errors).reduce((acc, val) => {
                const field = val.path;

                if (!acc[field]) {
                    acc[field] = [];
                }

                acc[field].push(val.message);
                return acc;
            }, {});
        }

        res.status(statusCode).json({
            success: false,
            message,
            ...(errors && { errors }),
        });

    } catch (handlerError) {
        next(handlerError); // forward if error handler itself fails
    }
};

export default errorMiddleware;