import { Router } from "express";
import {
    sendReminders,
    sendPasswordRotationReminders,
} from "../controllers/workflow.controller.js";

const workflowRouter = Router();

workflowRouter.post("/subscription/reminder", sendReminders);
workflowRouter.post("/account/password-reminder", sendPasswordRotationReminders);

export default workflowRouter;