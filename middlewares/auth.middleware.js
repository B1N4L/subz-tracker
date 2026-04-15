import jwt from "jsonwebtoken";
import {JWT_SECRET} from "../config/env.js";
import User from "../models/user.model.js";

//find the user based on the token made by the user(who's making the request), decodes it, verifies it, and attaches it to the request.
// unknown user request -> authorize middleware -> verify -> if valid -> give permission to proceed.
const authorize = async (req, res, next) => {
    try{
        let token;
        //if no bearer
        if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) { //this is protocol. should start with bearer
            token = req.headers.authorization.split(" ")[1]; //if starts with bearer, token will be there.
        }

        //if no token received
        if (!token) return res.status(401).json({ message: "Unauthorized: no token received" });

        const decodedToken = await jwt.verify(token, JWT_SECRET);
        const user = await User.findById(decodedToken.userId);

        //if user doesn't exists
        if (!user) return res.status(401).json({ message: "Unauthorized: user does not exist" });

        //finally add the user details to the request that's being made
        req.user = user;
        //if user exists
        next();
    }catch(err){
        res.status(401).json({
            message: "Not authorized",
            error: err.message
        })
        next(err);
    }
}
export default authorize;