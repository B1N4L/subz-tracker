import Account from "../models/account.model.js";
import Subscription from "../models/subscription.model.js";
import logger from "../config/logger.js";

export const createAccount = async (req, res, next) => {
    try {
        const { user, _id, ...accountData } = req.body;

        const account = await Account.create({
            ...accountData,
            user: req.user._id,
        });

        logger.info("Account created successfully", {
            accountId: account._id,
            userId: req.user._id,
            serviceName: account.serviceName,
        });

        res.status(201).json({
            success: true,
            message: "Account created successfully",
            data: account,
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

        // Prevent client from changing ownership or document ID
        const { user, _id, ...updateFields } = req.body;
        Object.assign(account, updateFields);
        await account.save();

        logger.info("Account updated successfully", {
            accountId: account._id,
            userId: req.user._id,
        });

        res.status(200).json({
            success: true,
            message: "Account updated successfully",
            data: account,
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
