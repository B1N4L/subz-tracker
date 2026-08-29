import { Router } from "express";
import authorize from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import { createSubscriptionSchema, updateSubscriptionSchema } from "../schemas/subscription.schema.js";
import {
    createSubscription,
    getAllSubscriptions,
    getSubscriptionById,
    getSubscriptionsByUser,
    updateSubscription,
    cancelSubscription,
    deleteSubscription,
    getUpcomingRenewals,
} from "../controllers/subscription.controller.js";

const subscriptionRouter = Router();

// Protect all subscription routes with authorization
subscriptionRouter.use(authorize);

// Static/specific endpoints (defined BEFORE /:id wildcard)
subscriptionRouter.get("/", getAllSubscriptions);
subscriptionRouter.post("/", validate(createSubscriptionSchema), createSubscription);
subscriptionRouter.get("/upcoming-renewals", getUpcomingRenewals);
subscriptionRouter.get("/user/:id", getSubscriptionsByUser);

// Parametric endpoints (/:id)
subscriptionRouter.get("/:id", getSubscriptionById);
subscriptionRouter.put("/:id", validate(updateSubscriptionSchema), updateSubscription);
subscriptionRouter.put("/:id/cancel", cancelSubscription);
subscriptionRouter.delete("/:id", deleteSubscription);

export default subscriptionRouter;