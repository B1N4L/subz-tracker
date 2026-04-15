import User from "../models/user.model.js";

export const  getUsers = async (req, res, next) => {
    try{
        const users = await User.find(); //find all users
        return res.status(200).json({success: true, data: users});
    }catch(err){
        next(err);
    }
}

export const  getUser = async (req, res, next) => {
    try{
        const user = await User.findById(req.params.id).select('-password'); //get all selected user's fields except password
        if (!user){
            const error = new Error('User not found');
            error.status = 404;
            throw error; //this is caught by our error handling middleware.
        }
        return res.status(200).json({success: true, data: user});
    }catch(err){
        next(err);
    }
}



