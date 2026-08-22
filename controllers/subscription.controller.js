import Subscription from "../models/subscription.model.js";
import { workflowClient } from "../config/upstash.js";
import { SERVER_URL } from "../config/env.js";

export const createSubscription = async (req, res, next) => {
    try {
        const subscription = await Subscription.create({
            ...req.body,
            user: req.user._id,
        });

        let workflowRunId = null;
        try {
            const triggerResult = await workflowClient.trigger({
                url: `${SERVER_URL}/api/v1/workflow/subscription/reminder`,
                body: { subscriptionId: subscription.id },
                headers: { 'Content-Type': 'application/json' },
                retries: 0,
            });
            workflowRunId = triggerResult.workflowRunId;
        } catch (wfErr) {
            console.warn('Upstash workflow trigger skipped/failed:', wfErr.message);
        }

        res.status(201).json({
            success: true,
            data: { subscription, workflowRunId },
        });
    } catch (err) {
        next(err);
    }
};

export const getAllSubscriptions = async (req, res, next) => {
    try {
        const query = { user: req.user._id };

        if (req.query.category) query.category = req.query.category.toLowerCase();
        if (req.query.status) query.status = req.query.status.toLowerCase();

        const subscriptions = await Subscription.find(query).sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            count: subscriptions.length,
            data: subscriptions,
        });
    } catch (err) {
        next(err);
    }
};

export const getSubscriptionsByUser = async (req, res, next) => {
    try {
        if (req.user._id.toString() !== req.params.id) {
            const error = new Error('You are not the owner of this account');
            error.statusCode = 403;
            throw error;
        }
        const subscriptions = await Subscription.find({ user: req.params.id });
        res.status(200).json({
            success: true,
            count: subscriptions.length,
            data: subscriptions,
        });
    } catch (err) {
        next(err);
    }
};

export const getSubscriptionById = async (req, res, next) => {
    try {
        const subscription = await Subscription.findById(req.params.id);

        if (!subscription) {
            const error = new Error('Subscription not found');
            error.statusCode = 404;
            throw error;
        }

        if (subscription.user.toString() !== req.user._id.toString()) {
            const error = new Error('You are not authorized to view this subscription');
            error.statusCode = 403;
            throw error;
        }

        res.status(200).json({
            success: true,
            data: subscription,
        });
    } catch (err) {
        next(err);
    }
};

export const updateSubscription = async (req, res, next) => {
    try {
        const subscription = await Subscription.findById(req.params.id);

        if (!subscription) {
            const error = new Error('Subscription not found');
            error.statusCode = 404;
            throw error;
        }

        if (subscription.user.toString() !== req.user._id.toString()) {
            const error = new Error('You are not authorized to modify this subscription');
            error.statusCode = 403;
            throw error;
        }

        Object.assign(subscription, req.body);
        await subscription.save();

        res.status(200).json({
            success: true,
            message: 'Subscription updated successfully',
            data: subscription,
        });
    } catch (err) {
        next(err);
    }
};

export const cancelSubscription = async (req, res, next) => {
    try {
        const subscription = await Subscription.findById(req.params.id);

        if (!subscription) {
            const error = new Error('Subscription not found');
            error.statusCode = 404;
            throw error;
        }

        if (subscription.user.toString() !== req.user._id.toString()) {
            const error = new Error('You are not authorized to modify this subscription');
            error.statusCode = 403;
            throw error;
        }

        subscription.status = 'canceled';
        await subscription.save();

        res.status(200).json({
            success: true,
            message: 'Subscription canceled successfully',
            data: subscription,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteSubscription = async (req, res, next) => {
    try {
        const subscription = await Subscription.findById(req.params.id);

        if (!subscription) {
            const error = new Error('Subscription not found');
            error.statusCode = 404;
            throw error;
        }

        if (subscription.user.toString() !== req.user._id.toString()) {
            const error = new Error('You are not authorized to delete this subscription');
            error.statusCode = 403;
            throw error;
        }

        await subscription.deleteOne();

        res.status(200).json({
            success: true,
            message: 'Subscription deleted successfully',
        });
    } catch (err) {
        next(err);
    }
};

export const getUpcomingRenewals = async (req, res, next) => {
    try {
        const days = parseInt(req.query.days) || 7;
        const now = new Date();
        const futureDate = new Date();
        futureDate.setDate(now.getDate() + days);

        const subscriptions = await Subscription.find({
            user: req.user._id,
            status: 'active',
            renewalDate: {
                $gte: now,
                $lte: futureDate,
            },
        }).sort({ renewalDate: 1 });

        res.status(200).json({
            success: true,
            count: subscriptions.length,
            data: subscriptions,
        });
    } catch (err) {
        next(err);
    }
};