import { emailTemplates, generatePasswordRotationEmailTemplate } from './email-template.js';
import dayjs from 'dayjs';
import transporter, { accountEmail } from '../config/nodemailer.js';
import logger from '../config/logger.js';

export const sendReminderEmail = async ({ to, type, subscription }) => {
    if(!to || !type) throw new Error('Missing required parameters');

    const template = emailTemplates.find((t) => t.label === type);

    if(!template) throw new Error('Invalid email type');

    const mailInfo = {
        userName: subscription.user.name,
        subscriptionName: subscription.name,
        renewalDate: dayjs(subscription.renewalDate).format('MMM D, YYYY'),
        planName: subscription.name,
        price: `${subscription.currency} ${subscription.price} (${subscription.frequency})`,
        paymentMethod: subscription.paymentMethod,
    };
    const message = template.generateBody(mailInfo);
    const subject = template.generateSubject(mailInfo);

    const mailOptions = {
        from: accountEmail,
        to: to,
        subject: subject,
        html: message,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if(error) return logger.error('Error sending email:', { error: error.message, stack: error.stack, to, type });

        logger.info(`Email sent successfully to ${to}: ${info.response}`);
    });
};

export const sendPasswordRotationReminderEmail = async ({
    to,
    userName,
    serviceName,
    username,
    reminderType = 'due',
    daysSinceChanged,
    dueDate,
}) => {
    if (!to || !userName || !serviceName) {
        throw new Error('Missing required parameters for password rotation reminder');
    }

    let subject = `🔐 Security Reminder: It's time to rotate your ${serviceName} password`;
    let statusText = `Your ${serviceName} password was last changed ${daysSinceChanged} days ago and is due for rotation.`;
    let badgeColor = '#e67e22';

    if (reminderType === '7_days_before') {
        subject = `⏳ Security Notice: ${serviceName} Password Rotation Due in 7 Days`;
        statusText = `Your ${serviceName} password will reach its rotation threshold in 7 days.`;
        badgeColor = '#3498db';
    } else if (reminderType === 'overdue') {
        subject = `⚠️ Urgent Security Notice: ${serviceName} Password is Overdue for Rotation`;
        statusText = `Your ${serviceName} password is overdue for rotation (last changed ${daysSinceChanged} days ago).`;
        badgeColor = '#e74c3c';
    }

    const html = generatePasswordRotationEmailTemplate({
        userName,
        serviceName,
        username,
        dueDate: dayjs(dueDate).format('MMM D, YYYY'),
        daysSinceChanged,
        statusText,
        badgeColor,
    });

    const mailOptions = {
        from: accountEmail,
        to,
        subject,
        html,
    };

    transporter.sendMail(mailOptions, (error, info) => {
        if (error) {
            return logger.error('Error sending password rotation email:', {
                error: error.message,
                stack: error.stack,
                to,
                serviceName,
                reminderType,
            });
        }
        logger.info(`Password rotation reminder email sent to ${to} for ${serviceName}: ${info.response}`);
    });
};