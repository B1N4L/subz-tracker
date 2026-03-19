import Subscription from "../models/subscription.model.js";
import dayjs from "dayjs";

//because workflow written in common js instead of ES6
// app.js (or any .mjs / .js when "type":"module")
import { createRequire } from 'node:module';
import {sendReminderEmail} from "../utils/send-email.js";
const require = createRequire(import.meta.url);
const { serve } = require('@upstash/workflow/express');

const REMINDERS = [7, 5, 2, 1];

export const sendReminders = serve( async(context) => {
   const {subscriptionId} = context.requestPayload;
   const subscription = await fetchSubscription(context, subscriptionId);

   if (!subscription || subscription.status !== 'active') return;

   const renewalDate = dayjs(subscription.renewalDate);

   if(renewalDate.isBefore(dayjs())){
       console.log(`Renewal date has passed for subscription ${subscriptionId}. Stopping workflow...`);
       return;
   }

   for(const daysBefore of REMINDERS){
       const reminderDate = renewalDate.subtract(daysBefore, 'day'); //not 'days'
       //eg: if renewal date = 22 Feb, reminder dates = = 15 Feb, 17 Feb, 20 Feb, 21 Feb

       //put it to sleep until it's ready to be fired
       if(reminderDate.isAfter(dayjs()) ){
           await sleepUntilReminder(context, `Reminder ${daysBefore} days before`, reminderDate);
       }

       //without this if, all 4 reminders will be sent at once even after when a subscription has passed some reminders.
       if (dayjs().isSame(reminderDate, 'day')) {
           await triggerReminder(context, `${daysBefore} days before reminder`, subscription);
       }
   }

});

const fetchSubscription = async (context, subscriptionId) => {
    return await context.run('get subscription', async () => {
        return Subscription.findById(subscriptionId).populate('user', 'name email').lean();
    })
}

const sleepUntilReminder = async (context, label, date) => {
    console.log(`Sleeping until ${label} reminder at ${date}...`);
    await context.sleepUntil(label, date.toDate());
}

const triggerReminder = async (context, label, subscription, reminder) => {
    return await context.run(label, async () => {
        console.log(`Triggering ${label} reminder now`);

        await sendReminderEmail({
            to: subscription.user.email,
            type: label,
            subscription,
        })

    });
}