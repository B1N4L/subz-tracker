import nodemailer from "nodemailer";
import {EMAIL_PASSWORD} from "./env.js";


//this is being imported to send-email.js
export const accountEmail = 'binallokitha01@gmail.com';

//configure a transporter using gmail as a service
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: accountEmail,
        pass: EMAIL_PASSWORD,
    }
})

export default transporter;