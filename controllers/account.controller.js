import Account from "../models/account.model.js";
import Subscription from "../models/subscription.model.js";
import { encryptCredential, decryptCredential } from "../utils/crypto.js";
import { workflowClient } from "../config/upstash.js";
import { SERVER_URL } from "../config/env.js";
import logger from "../config/logger.js";
import dayjs from "dayjs";

export const createAccount = async (req, res, next) => {
    try {
        const { user, _id, password, ...accountData } = req.body;

        const newAccountPayload = {
            ...accountData,
            user: req.user._id,
        };

        const hasNewPassword =
            password && typeof password === "string" && password.trim().length > 0;

        // Encrypt password if provided
        if (hasNewPassword) {
            const encryptedData = encryptCredential(password);
            newAccountPayload.credential = encryptedData;
            newAccountPayload.hasPassword = true;
            newAccountPayload.passwordLastChanged = new Date();
        }

        const account = await Account.create(newAccountPayload);

        // Trigger password rotation reminder workflow if password was set and reminder enabled
        if (hasNewPassword && account.rotationReminderEnabled) {
            try {
                await workflowClient.trigger({
                    url: `${SERVER_URL}/api/v1/workflow/account/password-reminder`,
                    body: {
                        accountId: account.id,
                        initialPasswordChangedAt: account.passwordLastChanged?.toISOString(),
                    },
                    headers: { "Content-Type": "application/json" },
                    retries: 0,
                });
            } catch (wfErr) {
                logger.warn("Upstash password rotation workflow trigger skipped/failed:", {
                    error: wfErr.message,
                });
            }
        }

        logger.info("Account created successfully", {
            accountId: account._id,
            userId: req.user._id,
            serviceName: account.serviceName,
            hasPassword: account.hasPassword,
        });

        // Ensure password is not present in returned data
        const responseData = account.toObject();
        delete responseData.credential;

        res.status(201).json({
            success: true,
            message: "Account created successfully",
            data: responseData,
        });
    } catch (err) {
        next(err);
    }
};

export const getAllAccounts = async (req, res, next) => {
    try {
        const query = { user: req.user._id };

        // Filter by category
        if (req.query.category) {
            query.category = req.query.category.toLowerCase().trim();
        }

        // Filter by tags
        if (req.query.tag || req.query.tags) {
            const tagStr = req.query.tag || req.query.tags;
            const tagList = tagStr
                .split(",")
                .map((t) => t.trim().toLowerCase())
                .filter(Boolean);

            if (tagList.length > 0) {
                query.tags = { $in: tagList };
            }
        }

        // Search by service name (case-insensitive substring)
        if (req.query.search || req.query.serviceName) {
            const searchTerm = (req.query.search || req.query.serviceName).trim();
            if (searchTerm) {
                query.serviceName = { $regex: searchTerm, $options: "i" };
            }
        }

        // Pagination support
        if (req.query.page || req.query.limit) {
            const page = Math.max(1, parseInt(req.query.page, 10) || 1);
            const limit = Math.max(1, parseInt(req.query.limit, 10) || 10);
            const skip = (page - 1) * limit;

            const total = await Account.countDocuments(query);
            const accounts = await Account.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limit);

            return res.status(200).json({
                success: true,
                count: accounts.length,
                total,
                page,
                totalPages: Math.ceil(total / limit),
                data: accounts,
            });
        }

        const accounts = await Account.find(query).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: accounts.length,
            data: accounts,
        });
    } catch (err) {
        next(err);
    }
};

export const getAccountById = async (req, res, next) => {
    try {
        const account = await Account.findById(req.params.id);

        if (!account) {
            const error = new Error("Account not found");
            error.statusCode = 404;
            throw error;
        }

        // Server-side authorization check (IDOR prevention)
        if (account.user.toString() !== req.user._id.toString()) {
            const error = new Error("You are not authorized to view this account");
            error.statusCode = 403;
            throw error;
        }

        res.status(200).json({
            success: true,
            data: account,
        });
    } catch (err) {
        next(err);
    }
};

export const updateAccount = async (req, res, next) => {
    try {
        const account = await Account.findById(req.params.id);

        if (!account) {
            const error = new Error("Account not found");
            error.statusCode = 404;
            throw error;
        }

        // Server-side authorization check (IDOR prevention)
        if (account.user.toString() !== req.user._id.toString()) {
            const error = new Error("You are not authorized to modify this account");
            error.statusCode = 403;
            throw error;
        }

        // Prevent client from changing ownership, document ID, or injecting raw credentials
        const { user, _id, credential, password, ...updateFields } = req.body;
        Object.assign(account, updateFields);

        let passwordWasUpdated = false;

        // Handle password update
        if (typeof password === "string" && password.trim().length > 0) {
            account.credential = encryptCredential(password);
            account.hasPassword = true;
            account.passwordLastChanged = new Date();
            passwordWasUpdated = true;
        } else if (password === null || password === "") {
            // Explicitly clear password if requested
            account.credential = {
                encryptedPassword: null,
                iv: null,
                authTag: null,
            };
            account.hasPassword = false;
            account.passwordLastChanged = null;
        }

        await account.save();

        // Trigger new password rotation workflow if password was updated
        if (passwordWasUpdated && account.rotationReminderEnabled) {
            try {
                await workflowClient.trigger({
                    url: `${SERVER_URL}/api/v1/workflow/account/password-reminder`,
                    body: {
                        accountId: account.id,
                        initialPasswordChangedAt: account.passwordLastChanged?.toISOString(),
                    },
                    headers: { "Content-Type": "application/json" },
                    retries: 0,
                });
            } catch (wfErr) {
                logger.warn("Upstash password rotation workflow trigger skipped/failed:", {
                    error: wfErr.message,
                });
            }
        }

        logger.info("Account updated successfully", {
            accountId: account._id,
            userId: req.user._id,
            hasPassword: account.hasPassword,
        });

        // Ensure credential subdocument is stripped from the response
        const responseData = account.toObject();
        delete responseData.credential;

        res.status(200).json({
            success: true,
            message: "Account updated successfully",
            data: responseData,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteAccount = async (req, res, next) => {
    try {
        const account = await Account.findById(req.params.id);

        if (!account) {
            const error = new Error("Account not found");
            error.statusCode = 404;
            throw error;
        }

        // Server-side authorization check (IDOR prevention)
        if (account.user.toString() !== req.user._id.toString()) {
            const error = new Error("You are not authorized to delete this account");
            error.statusCode = 403;
            throw error;
        }

        await account.deleteOne();

        // Safely unlink any subscriptions referencing this deleted account
        await Subscription.updateMany(
            { account: account._id },
            { $set: { account: null } }
        );

        logger.info("Account deleted successfully", {
            accountId: account._id,
            userId: req.user._id,
        });

        res.status(200).json({
            success: true,
            message: "Account deleted successfully",
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Dedicated endpoint to securely decrypt and reveal an Account password
 * Accessible only by the authenticated account owner
 */
export const revealAccountPassword = async (req, res, next) => {
    try {
        // Explicitly select the hidden credential subdocument
        const account = await Account.findById(req.params.id).select(
            "+credential.encryptedPassword +credential.iv +credential.authTag +credential.keyVersion"
        );

        if (!account) {
            const error = new Error("Account not found");
            error.statusCode = 404;
            throw error;
        }

        // Server-side authorization check (IDOR prevention)
        if (account.user.toString() !== req.user._id.toString()) {
            const error = new Error("You are not authorized to view credentials for this account");
            error.statusCode = 403;
            throw error;
        }

        if (
            !account.hasPassword ||
            !account.credential ||
            !account.credential.encryptedPassword
        ) {
            const error = new Error("No password stored for this account");
            error.statusCode = 404;
            throw error;
        }

        let decryptedPassword;
        try {
            decryptedPassword = decryptCredential(account.credential);
        } catch (decryptErr) {
            logger.error("Failed to decrypt account credential", {
                accountId: account._id,
                userId: req.user._id,
                error: decryptErr.message,
            });
            const error = new Error("Unable to decrypt account credential");
            error.statusCode = 500;
            throw error;
        }

        logger.info("Account password revealed successfully", {
            accountId: account._id,
            userId: req.user._id,
        });

        res.status(200).json({
            success: true,
            data: {
                _id: account._id,
                serviceName: account.serviceName,
                username: account.username,
                password: decryptedPassword,
                passwordLastChanged: account.passwordLastChanged,
                passwordRotationIntervalDays: account.passwordRotationIntervalDays,
            },
        });
    } catch (err) {
        next(err);
    }
};

/**
 * Retrieves accounts with stale/due passwords for the authenticated user
 */
export const getStalePasswordAccounts = async (req, res, next) => {
    try {
        const accounts = await Account.find({
            user: req.user._id,
            hasPassword: true,
        }).sort({ passwordLastChanged: 1 });

        const now = dayjs();
        const analyzed = accounts.map((acc) => {
            const lastChanged = dayjs(acc.passwordLastChanged || acc.createdAt);
            const intervalDays = acc.passwordRotationIntervalDays || 90;
            const dueDate = lastChanged.add(intervalDays, "day");
            const daysSinceChanged = now.diff(lastChanged, "day");
            const daysUntilDue = dueDate.diff(now, "day");
            const isOverdue = daysUntilDue < 0;
            const isDueSoon = daysUntilDue >= 0 && daysUntilDue <= 7;

            return {
                _id: acc._id,
                serviceName: acc.serviceName,
                username: acc.username,
                category: acc.category,
                passwordLastChanged: acc.passwordLastChanged,
                passwordRotationIntervalDays: intervalDays,
                rotationReminderEnabled: acc.rotationReminderEnabled,
                lastRotationReminderSent: acc.lastRotationReminderSent,
                dueDate: dueDate.toISOString(),
                daysSinceChanged,
                daysUntilDue,
                status: isOverdue ? "overdue" : isDueSoon ? "due_soon" : "healthy",
            };
        });

        // Filter by status if requested (?status=overdue or ?status=due_soon)
        const filterStatus = req.query.status?.toLowerCase();
        const filtered = filterStatus
            ? analyzed.filter((a) => a.status === filterStatus)
            : analyzed;

        res.status(200).json({
            success: true,
            count: filtered.length,
            totalAccountsWithPasswords: accounts.length,
            overdueCount: analyzed.filter((a) => a.status === "overdue").length,
            dueSoonCount: analyzed.filter((a) => a.status === "due_soon").length,
            data: filtered,
        });
    } catch (err) {
        next(err);
    }
};
