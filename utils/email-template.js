export const generateEmailTemplate = ({
    userName,
    subscriptionName,
    renewalDate,
    planName,
    price,
    paymentMethod,
    accountSettingsLink,
    supportLink,
    daysLeft,
}) => `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f4f7fa;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <tr>
            <td style="background-color: #4a90e2; text-align: center; padding: 20px;">
                <p style="font-size: 36px; line-height: 36px; font-weight: 800; color: #ffffff; margin: 0;">SubMgr</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 40px 30px;">                
                <p style="font-size: 16px; margin-bottom: 25px;">Hello <strong style="color: #4a90e2;">${userName}</strong>,</p>
                
                <p style="font-size: 16px; margin-bottom: 25px;">Your <strong>${subscriptionName}</strong> subscription is set to renew on <strong style="color: #4a90e2;">${renewalDate}</strong> (${daysLeft} days from today).</p>
                
                <table cellpadding="15" cellspacing="0" border="0" width="100%" style="background-color: #f0f7ff; border-radius: 10px; margin-bottom: 25px;">
                    <tr>
                        <td style="font-size: 16px; border-bottom: 1px solid #d0e3ff;">
                            <strong>Plan:</strong> ${planName}
                        </td>
                    </tr>
                    <tr>
                        <td style="font-size: 16px; border-bottom: 1px solid #d0e3ff;">
                            <strong>Price:</strong> ${price}
                        </td>
                    </tr>
                    <tr>
                        <td style="font-size: 16px;">
                            <strong>Payment Method:</strong> ${paymentMethod}
                        </td>
                    </tr>
                </table>
                
                <p style="font-size: 16px; margin-bottom: 25px;">If you'd like to make changes or cancel your subscription, please visit your <a href="${accountSettingsLink || '#'}" style="color: #4a90e2; text-decoration: none;">account settings</a> before the renewal date.</p>
                
                <p style="font-size: 16px; margin-top: 30px;">Need help? <a href="${supportLink || '#'}" style="color: #4a90e2; text-decoration: none;">Contact our support team</a> anytime.</p>
                
                <p style="font-size: 16px; margin-top: 30px;">
                    Best regards,<br>
                    <strong>The SubMgr Team</strong>
                </p>
            </td>
        </tr>
        <tr>
            <td style="background-color: #f0f7ff; padding: 20px; text-align: center; font-size: 14px;">
                <p style="margin: 0 0 10px;">SubMgr Inc. | Subscription & Credential Vault</p>
                <p style="margin: 0;">
                    <a href="#" style="color: #4a90e2; text-decoration: none; margin: 0 10px;">Privacy Policy</a> | 
                    <a href="#" style="color: #4a90e2; text-decoration: none; margin: 0 10px;">Terms of Service</a>
                </p>
            </td>
        </tr>
    </table>
</div>
`;

export const generatePasswordRotationEmailTemplate = ({
    userName,
    serviceName,
    username,
    dueDate,
    daysSinceChanged,
    statusText,
    badgeColor = '#e67e22',
}) => `
<div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 0; background-color: #f4f7fa;">
    <table cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #ffffff; border-radius: 10px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
        <tr>
            <td style="background-color: #2c3e50; text-align: center; padding: 25px;">
                <p style="font-size: 32px; line-height: 32px; font-weight: 800; color: #ffffff; margin: 0;">🛡️ SubMgr Security</p>
            </td>
        </tr>
        <tr>
            <td style="padding: 35px 30px;">                
                <p style="font-size: 16px; margin-bottom: 20px;">Hello <strong>${userName}</strong>,</p>
                
                <div style="background-color: #fcf3cf; border-left: 5px solid ${badgeColor}; padding: 15px; border-radius: 4px; margin-bottom: 25px;">
                    <strong style="color: #7d6608; font-size: 16px;">Password Rotation Notice</strong>
                    <p style="margin: 5px 0 0 0; color: #7d6608; font-size: 14px;">${statusText}</p>
                </div>

                <p style="font-size: 15px; margin-bottom: 20px;">
                    Regular password rotation protects your external accounts against credential stuffing, stale breaches, and unauthorized access.
                </p>
                
                <table cellpadding="12" cellspacing="0" border="0" width="100%" style="background-color: #f8f9fa; border-radius: 8px; margin-bottom: 25px; border: 1px solid #e9ecef;">
                    <tr>
                        <td style="font-size: 14px; border-bottom: 1px solid #e9ecef; color: #6c757d;" width="40%">Service:</td>
                        <td style="font-size: 15px; border-bottom: 1px solid #e9ecef; font-weight: 600;">${serviceName}</td>
                    </tr>
                    ${username ? `
                    <tr>
                        <td style="font-size: 14px; border-bottom: 1px solid #e9ecef; color: #6c757d;">Account / Username:</td>
                        <td style="font-size: 15px; border-bottom: 1px solid #e9ecef; font-weight: 600;">${username}</td>
                    </tr>` : ''}
                    <tr>
                        <td style="font-size: 14px; border-bottom: 1px solid #e9ecef; color: #6c757d;">Last Changed:</td>
                        <td style="font-size: 14px; border-bottom: 1px solid #e9ecef;">${daysSinceChanged} days ago</td>
                    </tr>
                    <tr>
                        <td style="font-size: 14px; color: #6c757d;">Target Rotation Date:</td>
                        <td style="font-size: 14px; font-weight: 600; color: ${badgeColor};">${dueDate}</td>
                    </tr>
                </table>

                <p style="font-size: 15px; margin-bottom: 25px;">
                    Please log into <strong>${serviceName}</strong>, update your password, and record the update in your SubMgr vault.
                </p>
                
                <p style="font-size: 15px; margin-top: 30px;">
                    Stay safe,<br>
                    <strong>The SubMgr Security Team</strong>
                </p>
            </td>
        </tr>
        <tr>
            <td style="background-color: #f8f9fa; padding: 18px; text-align: center; font-size: 13px; color: #6c757d; border-top: 1px solid #e9ecef;">
                <p style="margin: 0 0 5px;">SubMgr Inc. | Automated Security Vault Reminders</p>
                <p style="margin: 0;">This is an automated security reminder. You can customize rotation intervals in your account settings.</p>
            </td>
        </tr>
    </table>
</div>
`;

export const emailTemplates = [
    {
        label: "7 days before reminder",
        generateSubject: (data) =>
            `📅 Reminder: Your ${data.subscriptionName} Subscription Renews in 7 Days!`,
        generateBody: (data) => generateEmailTemplate({ ...data, daysLeft: 7 }),
    },
    {
        label: "5 days before reminder",
        generateSubject: (data) =>
            `⏳ ${data.subscriptionName} Renews in 5 Days – Stay Subscribed!`,
        generateBody: (data) => generateEmailTemplate({ ...data, daysLeft: 5 }),
    },
    {
        label: "2 days before reminder",
        generateSubject: (data) =>
            `🚀 2 Days Left! ${data.subscriptionName} Subscription Renewal`,
        generateBody: (data) => generateEmailTemplate({ ...data, daysLeft: 2 }),
    },
    {
        label: "1 days before reminder",
        generateSubject: (data) =>
            `⚡ Final Reminder: ${data.subscriptionName} Renews Tomorrow!`,
        generateBody: (data) => generateEmailTemplate({ ...data, daysLeft: 1 }),
    },
];