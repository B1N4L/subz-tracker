import Subscription from "../models/subscription.model.js";
import Account from "../models/account.model.js";
import dayjs from "dayjs";
import logger from "../config/logger.js";

// Import createRequire for CommonJS Upstash workflow module in ES modules
import { createRequire } from 'node:module';
import { sendReminderEmail, sendPasswordRotationReminderEmail } from "../utils/send-email.js";
const require = createRequire(import.meta.url);
const { serve } = require('@upstash/workflow/express');

const SUBSCRIPTION_REMINDERS = [7, 5, 2, 1];

/**
 * Upstash workflow for Subscription renewal reminders
 */
export const sendReminders = serve(async (context) => {
    const { subscriptionId } = context.requestPayload;
    const subscription = await fetchSubscription(context, subscriptionId);

    if (!subscription || subscription.status !== 'active') return;

    const renewalDate = dayjs(subscription.renewalDate);

    if (renewalDate.isBefore(dayjs())) {
        logger.info(`Renewal date has passed for subscription ${subscriptionId}. Stopping workflow...`);
        return;
    }

    for (const daysBefore of SUBSCRIPTION_REMINDERS) {
        const reminderDate = renewalDate.subtract(daysBefore, 'day');

        if (reminderDate.isAfter(dayjs())) {
            await sleepUntilReminder(context, `Reminder ${daysBefore} days before`, reminderDate);
        }

        if (dayjs().isSame(reminderDate, 'day')) {
            await triggerReminder(context, `${daysBefore} days before reminder`, subscription);
        }
    }
});

const fetchSubscription = async (context, subscriptionId) => {
    return await context.run('get subscription', async () => {
        return Subscription.findById(subscriptionId).populate('user', 'name email').lean();
    });
};

const sleepUntilReminder = async (context, label, date) => {
    logger.info(`Sleeping until ${label} reminder at ${date}...`);
    await context.sleepUntil(label, date.toDate());
};

const triggerReminder = async (context, label, subscription) => {
    return await context.run(label, async () => {
        logger.info(`Triggering ${label} reminder now`);

        await sendReminderEmail({
            to: subscription.user.email,
            type: label,
            subscription,
        });
    });
};

/**
 * Upstash workflow for Password Rotation reminders
 */
export const sendPasswordRotationReminders = serve(async (context) => {
    const { accountId, initialPasswordChangedAt } = context.requestPayload;

    const account = await context.run('get-account', async () => {
        return Account.findById(accountId).populate('user', 'name email').lean();
    });

    if (!account || !account.hasPassword || !account.rotationReminderEnabled) {
        logger.info(`Account ${accountId} does not require rotation reminders. Stopping workflow.`);
        return;
    }

    const intervalDays = account.passwordRotationIntervalDays || 90;
    const lastChanged = dayjs(account.passwordLastChanged || account.createdAt);
    const dueDate = lastChanged.add(intervalDays, 'day');

    const milestones = [
        { type: '7_days_before', date: dueDate.subtract(7, 'day') },
        { type: 'due', date: dueDate },
        { type: 'overdue', date: dueDate.add(14, 'day') },
    ];

    for (const milestone of milestones) {
        if (milestone.date.isAfter(dayjs())) {
            await context.sleepUntil(`Password Rotation ${milestone.type}`, milestone.date.toDate());
        }

        // Verify account status upon wake
        const latestAccount = await context.run(`verify-account-${milestone.type}`, async () => {
            return Account.findById(accountId).populate('user', 'name email').lean();
        });

        if (!latestAccount || !latestAccount.hasPassword || !latestAccount.rotationReminderEnabled) {
            logger.info(`Account ${accountId} credentials removed or reminder disabled. Stopping workflow.`);
            return;
        }

        // Check if user already changed their password
        const currentPasswordChangedAt = dayjs(latestAccount.passwordLastChanged).toISOString();
        if (initialPasswordChangedAt && currentPasswordChangedAt !== initialPasswordChangedAt) {
            logger.info(`Password for account ${accountId} was already updated. Stopping old rotation workflow.`);
            return;
        }

        // Trigger email notification
        await context.run(`send-email-${milestone.type}`, async () => {
            const daysSinceChanged = dayjs().diff(dayjs(latestAccount.passwordLastChanged || latestAccount.createdAt), 'day');
            await sendPasswordRotationReminderEmail({
                to: latestAccount.user.email,
                userName: latestAccount.user.name,
                serviceName: latestAccount.serviceName,
                username: latestAccount.username,
                reminderType: milestone.type,
                daysSinceChanged,
                dueDate: dueDate.toISOString(),
            });

            await Account.findByIdAndUpdate(accountId, { lastRotationReminderSent: new Date() });
        });
    }
});