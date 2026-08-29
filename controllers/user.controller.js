import User from "../models/user.model.js";
import Subscription from "../models/subscription.model.js";

export const getUsers = async (req, res, next) => {
    try {
        const users = await User.find().select('-password');
        return res.status(200).json({ success: true, count: users.length, data: users });
    } catch (err) {
        next(err);
    }
};

export const getUser = async (req, res, next) => {
    try {
        const user = await User.findById(req.params.id).select('-password');
        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }
        return res.status(200).json({ success: true, data: user });
    } catch (err) {
        next(err);
    }
};

export const updateUser = async (req, res, next) => {
    try {
        if (req.user._id.toString() !== req.params.id) {
            const error = new Error('You are not authorized to update this user account');
            error.statusCode = 403;
            throw error;
        }

        const updatedUser = await User.findByIdAndUpdate(
            req.params.id,
            { $set: req.body },
            { new: true, runValidators: true }
        ).select('-password');

        if (!updatedUser) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        return res.status(200).json({
            success: true,
            message: 'User profile updated successfully',
            data: updatedUser,
        });
    } catch (err) {
        next(err);
    }
};

export const deleteUser = async (req, res, next) => {
    try {
        if (req.user._id.toString() !== req.params.id) {
            const error = new Error('You are not authorized to delete this user account');
            error.statusCode = 403;
            throw error;
        }

        const user = await User.findByIdAndDelete(req.params.id);
        if (!user) {
            const error = new Error('User not found');
            error.statusCode = 404;
            throw error;
        }

        // Clean up user subscriptions
        await Subscription.deleteMany({ user: req.params.id });

        return res.status(200).json({
            success: true,
            message: 'User account and associated subscriptions deleted successfully',
        });
    } catch (err) {
        next(err);
    }
};
