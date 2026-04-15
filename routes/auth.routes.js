import {Router} from "express";
import {signIn, signUp, signOut} from "../controllers/auth.controller.js";

// api/v1/auth/...
const authRouter = Router();

authRouter.post("/sign-up", signUp);
authRouter.post("/sign-in", signIn);
authRouter.post("/sign-out", signOut);

export default authRouter;