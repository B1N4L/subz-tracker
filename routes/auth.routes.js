import {Router} from "express";
import {signIn, signUp, signOut} from "../controllers/auth.controller.js";
import {validate} from "../middlewares/validation.middleware.js";
import {signUpSchema, signInSchema} from "../schemas/auth.schema.js";

// api/v1/auth/...
const authRouter = Router();

authRouter.post("/sign-up", validate(signUpSchema), signUp);
authRouter.post("/sign-in", validate(signInSchema), signIn);
authRouter.post("/sign-out", signOut);

export default authRouter;