import { config } from 'dotenv';

//extracts environmental variables
//config({path: '.env'}); //suitable only when there's a single env. variable
config({
    path: `.env.${process.env.NODE_ENV || 'development'}.local`
});

//To switch between development and production with ease
//port number is getting from the env. variables file
export const {PORT, NODE_ENV, DB_URI} = process.env;

