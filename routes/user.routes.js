import { Router } from "express";
import authorize from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validation.middleware.js";
import { updateUserSchema } from "../schemas/user.schema.js";
import { getUser, getUsers, updateUser, deleteUser } from "../controllers/user.controller.js";

const userRouter = Router();

userRouter.get("/", authorize, getUsers);
userRouter.get("/:id", authorize, getUser);
userRouter.put("/:id", authorize, validate(updateUserSchema), updateUser);
userRouter.delete("/:id", authorize, deleteUser);

export default userRouter;