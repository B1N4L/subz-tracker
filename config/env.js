import { config } from 'dotenv'; //dotenv npm package

//extracts environmental variables
//config({path: '.env'}); //suitable only when there's a single env. variable
config({
    path: `.env.${process.env.NODE_ENV || 'development'}.local`
});

//To switch between development and production with ease
//port number is getting from the env. variables file
export const {
    PORT,
    SERVER_URL,
    NODE_ENV,
    DB_URI,
    JWT_SECRET, JWT_EXPIRES_IN,
    ARCJET_KEY, ARCJET_ENV,
    QSTASH_URL, QSTASH_TOKEN,
} = process.env;

