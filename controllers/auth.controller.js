import mongoose from "mongoose";
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import {JWT_EXPIRES_IN, JWT_SECRET} from "../config/env.js";

export const signUp = async (req, res, next) => {
    // signUp logic implementation
    const session = await mongoose.startSession(); //this is not a user session but a mongoose session
    session.startTransaction(); //used for atomic operations
    // atomic operations: if you do crud, do it completely or else the operation will fail with a bunch of errors.
    // Therefore never do the half of operations.
    // eg: if you don't enter all auth details to database unfinished or connectin fails, there will be errors.
    try {
        //create new user
        const { name, email, password } = req.body;

        //check user already exists
        const existingUser = await User.findOne({ email }); //returns bool
        if (existingUser){
            const error = new Error("User already exists");
            error.status = 409;
            throw error;
        }

        // hash the password for new user
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        //fix: user set to User
        const newUsers = await User.create(
            [{name, email, password: hashedPassword}],
            {session} // session also being sent: if something goes wrong during transaction, user will NOT be created when aborting it.
        );

        // if nothing goes wrong till here at the end of the try block, that means we can successfully complete the transaction(create user).

        // creating a token?
        const token = jwt.sign({userId: newUsers[0]._id}, JWT_SECRET, {expiresIn: JWT_EXPIRES_IN});
        await session.commitTransaction();
        session.endSession();
        res.status(201).json({
            success: true,
            message: "User created successfully",
            data: { token, user: newUsers[0] }
        })
    }catch(error){
        // if anything goes wrong, abort transaction with the database
        await session.abortTransaction();
        session.endSession();
        next(error);
    }
}

export const signIn = async (req, res, next) => {
    try{
        const {email, password} = req.body; //no need to get the name because already signing in
        const user = await User.findOne({email} )
        if(!user){
            const error = new Error("User not found");
            error.statusCode = 404;
            throw error;
        }
        //compare hash values(uer-typed pw and pw in db)
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if(!isPasswordValid){
            const error = new Error("Invalid password");
            error.statusCode = 401; //unauthorized
            throw error;
        }
        const token = jwt.sign({userId: user._id}, JWT_SECRET, {expiresIn: JWT_EXPIRES_IN});
        res.status(201).json({
            success: true,
            message: "User logged in successfully",
            data: { token, user }
        })
    }catch(error){
        next(error);
    }

}

export const signOut = async (req, res, next) => {
    // signOut logic implementation

}