import Subscription from "../models/subscription.model.js";
import {workflowClient} from "../config/upstash.js";
import {SERVER_URL} from "../config/env.js";

export const createSubscription = async (req, res, next) => {
    try{
        const subscription = await Subscription.create({
            ...req.body,
            //this req.user is not part of req.body. req.user is coming from auth middleware.
            user: req.user._id, //to which do we create the subscription
        });

        const {workflowRunId} = await workflowClient.trigger({
            url: `${SERVER_URL}/api/v1/workflow/subscription/reminder`,
            body: {
                subscriptionId: subscription.id,
            },
            headers: {
                'Content-Type': 'application/json',
            },
            retries: 0,
        });
        res.status(201).json({
            status: "success",
            data: {subscription, workflowRunId},
        });
    }catch(err){
        next(err);
    }
}

export const getSubscriptionsByUser = async (req, res, next) => {
    try{
        // check user is the same one in the token
        if(req.user._id.toString() !== req.params.id) { //object type is converted to string type with toString

            const error = new Error('You are not the owner of this account');
            error.status = 401;
            throw error;
        }
        const subscriptions = await Subscription.find({user: req.params.id});
        res.status(200).json({
            status: "success",
            data: subscriptions,
        })
    }catch(err){
        next(err);
    }
}

//PUT: updates a single subscription
export const updateSubscription = async (req, res, next) => {
    try{
        // check user is the same one in the token
        if(req.user._id.toString() !== req.params.id) {
            const error = new Error('You are not the owner of this account');
            error.status = 401;
            throw error;
        }
        // implement update subscription logic


    }catch(err){
        next(err);
    }
}