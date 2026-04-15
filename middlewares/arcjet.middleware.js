import aj from "../config/arcjet.js";
import arcjet from "@arcjet/node";

const arcjetMiddleware = async (req, res, next) => {
    try{
        const decision = await aj.protect(req, {requested: 1}); //protect this request and tell me your decision.
        console.log(`arcjet: ${decision}`);
        if (decision.isDenied()) {

            if(decision.reason.isRateLimit()){
                return res.status(429).json({error: 'Rate limit exceeded'})
            }
            // if(decision.reason.isBot()){
            //     return res.status(403).json({error: 'Access denied: Bot found'})
            // }
            res.status(403).json({error: 'Access Denied: suspicious activity found'})
        }

        next();
    }catch(err){
        console.error(`Arcjet middleware error: ${err}`);
        next(err);
    }
}

export default arcjetMiddleware;