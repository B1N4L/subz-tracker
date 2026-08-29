import { describe, it, expect } from 'vitest';
import {
    generateEmailTemplate,
    generatePasswordRotationEmailTemplate,
    emailTemplates,
} from '../../utils/email-template.js';

describe('Email Templates Unit Suite', () => {
    describe('Subscription Renewal Email Templates', () => {
        it('should render subscription renewal email template with given values', () => {
            const html = generateEmailTemplate({
                userName: 'John Doe',
                subscriptionName: 'Netflix Premium',
                renewalDate: 'Sep 1, 2026',
                planName: 'Netflix Premium (Monthly)',
                price: 'USD 19.99',
                paymentMethod: 'Credit Card',
                accountSettingsLink: 'https://example.com/settings',
                supportLink: 'https://example.com/support',
                daysLeft: 7,
            });

            expect(html).toContain('John Doe');
            expect(html).toContain('Netflix Premium');
            expect(html).toContain('Sep 1, 2026');
            expect(html).toContain('USD 19.99');
            expect(html).toContain('7 days from today');
        });

        it('should have standard milestone templates defined in emailTemplates array', () => {
            const labels = emailTemplates.map((t) => t.label);
            expect(labels).toContain('7 days before reminder');
            expect(labels).toContain('5 days before reminder');
            expect(labels).toContain('2 days before reminder');
            expect(labels).toContain('1 days before reminder');
        });
    });

    describe('Password Rotation Email Templates', () => {
        it('should render password rotation reminder email with user, service, and due date', () => {
            const html = generatePasswordRotationEmailTemplate({
                userName: 'Alice Smith',
                serviceName: 'GitHub Enterprise',
                username: 'alice.dev',
                dueDate: 'Sep 30, 2026',
                daysSinceChanged: 85,
                statusText: 'Your password rotation is due in 5 days.',
                badgeColor: '#e67e22',
            });

            expect(html).toContain('Alice Smith');
            expect(html).toContain('GitHub Enterprise');
            expect(html).toContain('alice.dev');
            expect(html).toContain('85 days ago');
            expect(html).toContain('Sep 30, 2026');
            expect(html).toContain('Your password rotation is due in 5 days.');
        });
    });
});
