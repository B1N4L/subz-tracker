import { Router } from "express";
import authorize from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import {
    createAccountSchema,
    updateAccountSchema,
    accountParamsSchema,
} from "../schemas/account.schema.js";
import {
    createAccount,
    getAllAccounts,
    getAccountById,
    updateAccount,
    deleteAccount,
    revealAccountPassword,
    getStalePasswordAccounts,
} from "../controllers/account.controller.js";

const accountRouter = Router();

// Protect all account routes with JWT authorization middleware
accountRouter.use(authorize);

accountRouter.get("/", getAllAccounts);
accountRouter.post("/", validate(createAccountSchema), createAccount);

// Rotation & security analytics endpoint (must be defined before /:id)
accountRouter.get("/stale-passwords", getStalePasswordAccounts);

// Single account routes
accountRouter.get("/:id", validate(accountParamsSchema), getAccountById);
accountRouter.put(
    "/:id",
    validate(accountParamsSchema),
    validate(updateAccountSchema),
    updateAccount
);
accountRouter.patch(
    "/:id",
    validate(accountParamsSchema),
    validate(updateAccountSchema),
    updateAccount
);
accountRouter.delete("/:id", validate(accountParamsSchema), deleteAccount);

// Dedicated password reveal endpoints
accountRouter.post(
    "/:id/reveal-password",
    validate(accountParamsSchema),
    revealAccountPassword
);
accountRouter.get(
    "/:id/password",
    validate(accountParamsSchema),
    revealAccountPassword
);

export default accountRouter;
