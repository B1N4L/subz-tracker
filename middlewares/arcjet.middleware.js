import aj from "../config/arcjet.js";
import logger from "../config/logger.js";

const arcjetMiddleware = async (req, res, next) => {
    try{
        const decision = await aj.protect(req, {requested: 1}); //protect this request and tell me your decision.
        logger.debug(`Arcjet decision: ${decision.conclusion}`, { reason: decision.reason });
        if (decision.isDenied()) {
            if(decision.reason.isRateLimit()){
                logger.warn('Arcjet rate limit exceeded', { ip: req.ip, path: req.originalUrl });
                return res.status(429).json({error: 'Rate limit exceeded'});
            }
            logger.warn('Arcjet suspicious activity denied', { ip: req.ip, path: req.originalUrl });
            return res.status(403).json({error: 'Access Denied: suspicious activity found'});
        }

        next();
    }catch(err){
        logger.error('Arcjet middleware error:', { error: err.message, stack: err.stack });
        next(err);
    }
}

export default arcjetMiddleware;