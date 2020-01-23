import logger from "./logger";
import dotenv from "dotenv";
import fs from "fs";

if (fs.existsSync(".env")) {
    logger.debug("Using .env file to supply config environment variables");
    dotenv.config({ path: ".env" });
}
export const ENVIRONMENT = process.env.NODE_ENV;
const prod = ENVIRONMENT === "production";

export const SESSION_SECRET = process.env["SESSION_SECRET"];
export const MONGODB_URI = prod ? process.env["MONGODB_URI"] : process.env["MONGODB_URI_LOCAL"];
export const TRUELAYER_CLIENT_ID = process.env["TRUELAYER_CLIENT_ID"];
export const TRUELAYER_CLIENT_SECRET = process.env["TRUELAYER_CLIENT_SECRET"];
export const TRUELAYER_REDIRECT_URL = process.env["TRUELAYER_REDIRECT_URL"];
export const BCRYPT_ROUND = process.env["BCRYPT_ROUND"];
export const TRUELAYER_ACCESSTOKEN_EXPIRES_TIME = process.env["TRUELAYER_ACCESSTOKEN_EXPIRES_TIME"];


if (!TRUELAYER_CLIENT_ID || !TRUELAYER_CLIENT_SECRET || !TRUELAYER_REDIRECT_URL) {
    logger.error("No TrueLayer information. Set TRUELAYER_*** environment variables.");
    process.exit(1);
}

if (!SESSION_SECRET) {
    logger.error("No client secret. Set SESSION_SECRET environment variable.");
    process.exit(1);
}

if (!MONGODB_URI) {
    if (prod) {
        logger.error("No mongo connection string. Set MONGODB_URI environment variable.");
    } else {
        logger.error("No mongo connection string. Set MONGODB_URI_LOCAL environment variable.");
    }
    process.exit(1);
}
