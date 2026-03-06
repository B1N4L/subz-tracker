// err: information that happened before the request
// next: what happens after when your'e ready to proceed to the next step
const errorMiddleware = (err, req, res, next) => {

    try{
        let error = {...err };
        error.message = err.message;
        console.error(err);


        // Mongoose bad ObjectId
        if(err.name === 'CastError'){
            const message = 'Resource not found';

            error = new Error(message);
            error.statusCode = 404;
        }

        // Mongoose duplicate key
        if(err.code === 11000){
            const message = 'Resource field already exists';
            error = new Error(message);
            error.statusCode = 400;
        }

        // Mongoose validation error
        if(err.name === 'ValidationError'){
            // form the message by mapping over values of the object.
            const message = Object.values(err.errors).map(value => {val.message});
            error = new Error(message.join(', '));
            error.statusCode = 400;
        }

        res.status(err.statusCode || 500).json({
            success: false,
            error: error.message || 'server error'
        });

    } catch(error){
        next(error); //to send the error to the next step to show error actually happened.
    }
};

export default errorMiddleware;
