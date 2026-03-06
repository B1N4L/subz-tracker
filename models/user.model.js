import mongoose from 'mongoose';

const userSchema = new mongoose.Schema({ //this defines how a specific schema going to look like
    name:{
        type:String,
        required:[true, 'username is required'],
        trim: true, //trim if there are empty spaces
        minlength: 2,
        maxlength: 50,
    },
    email:{
        type:String,
        required:[true, 'email is required'],
        trim: true,
        minlength: 5,
        maxlength: 50,
        lowercase: true,
        unique:true, //assuming only single email can be added
        match: [
            /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/,
            'Please enter a valid email address'
        ],
    },
    password:{
        type:String,
        required:[true, 'password is required'],
        trim: false,
        minlength: 6,
    }
}, {timestamps: true}); //to create createdAt and updatedAt fields for each user

//creating a new model off of the defined schema
const User = mongoose.model('User', userSchema);
export default User;