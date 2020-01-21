/* eslint-disable @typescript-eslint/camelcase */
import passport from "passport";
import passportLocal from "passport-local";
import passportCustom from "passport-custom";
import _ from "lodash";
import { TRUELAYER_CLIENT_ID, TRUELAYER_CLIENT_SECRET, TRUELAYER_REDIRECT_URL, TRUELAYER_ACCESSTOKEN_EXPIRES_TIME } from "../util/secrets";
import { User, UserDocument, AuthToken } from "../models/User";
import { Request, Response, NextFunction } from "express";
import { AuthAPIClient, DataAPIClient } from "truelayer-client";
import logger from "../util/logger";

const trueLayerClient = new AuthAPIClient({
    client_id: TRUELAYER_CLIENT_ID,
    client_secret: TRUELAYER_CLIENT_SECRET
});

const LocalStrategy = passportLocal.Strategy;
const CustomStrategy = passportCustom.Strategy;

passport.serializeUser<any, any>((user, done) => {
    done(undefined, user.id);
});

passport.deserializeUser((id, done) => {
    User.findById(id, (err, user) => {
        done(err, user);
    });
});

/**
 * TrueLayer Strategy Overview
 *
 * - User is already logged in.
 *     - Link new TrueLayer account with currently logged-in user.
 * - User is not logged in.
 *   - Check if it's a returning user.
 *     - If returning user, sign in and done.
 *     - Else check if there is an existing account with user's email.
 *       - If there is, sign in too and done. (We can prefer to return an error message in this step. 
 *              Because that means the truelayer account has been related to another account.)
 *       - Else create a new account.
 */

/**
 * Sign in with TrueLayer
 */
passport.use("truelayer", new CustomStrategy(
    async function (req: any, done: any) {
        const code = req.query.code;
        const tokens = await trueLayerClient.exchangeCodeForToken(TRUELAYER_REDIRECT_URL, code);
        const info = await DataAPIClient.getInfo(tokens.access_token);
        if (req.user) {
            const user = req.user as UserDocument;
            User.findById(user.id, (err, user: any) => {
                if (err) { return done(err); }
                user.tokens = user.tokens.length > 0 ? user.tokens.filter((token: AuthToken) => !token.kind.includes("truelayer")) : user.tokens;
                user.tokens.push({
                    kind: "truelayer",
                    access_token: tokens.access_token,
                    refreshToken: tokens.refresh_token,
                    access_token_expires: new Date(Date.now() + +TRUELAYER_ACCESSTOKEN_EXPIRES_TIME)  //+1 Hour
                });
                user.save((err: Error) => {
                    req.flash("info", { msg: "TrueLayer account has been linked/updated." });
                    done(err, user);
                });
            });
        } else {
            //Info: I assume that I use only the first incoming mail in the system.
            const uniqueEmail = info.results[0].emails[0];
            User.findOne({ email: uniqueEmail }, (err, existingEmailUser: any) => {
                if (err) { return done(err); }
                if (existingEmailUser) {
                    existingEmailUser.tokens = existingEmailUser.tokens.length > 0 ? existingEmailUser.tokens.filter((token: AuthToken) => !token.kind.includes("truelayer")) : existingEmailUser.tokens;
                    existingEmailUser.tokens.push({
                        kind: "truelayer",
                        access_token: tokens.access_token,
                        refreshToken: tokens.refresh_token,
                        access_token_expires: new Date(Date.now() + +TRUELAYER_ACCESSTOKEN_EXPIRES_TIME)
                    });
                    existingEmailUser.save((err: Error) => {
                        done(err, existingEmailUser);
                    });
                } else {
                    const user: any = new User();
                    user.email = uniqueEmail;
                    user.tokens.push({
                        kind: "truelayer",
                        access_token: tokens.access_token,
                        refreshToken: tokens.refresh_token,
                        access_token_expires: new Date(Date.now() + +TRUELAYER_ACCESSTOKEN_EXPIRES_TIME)
                    });
                    user.profile.name = info.results[0].full_name;
                    user.save((err: Error) => {
                        done(err, user);
                    });
                }
            });
        }
    }
));

/**
 * Sign in using Email and Password.
 */
passport.use(new LocalStrategy({ usernameField: "email" }, (email, password, done) => {
    User.findOne({ email: email.toLowerCase() }, (err, user: any) => {
        if (err) { return done(err); }
        if (!user) {
            return done(undefined, false, { message: `Email ${email} not found.` });
        }
        user.comparePassword(password, (err: Error, isMatch: boolean) => {
            if (err) { return done(err); }
            if (isMatch) {
                return done(undefined, user);
            }
            return done(undefined, false, { message: "Invalid email or password." });
        });
    });
}));

/**
 * Login Required middleware.
 */
export const isAuthenticated = (req: Request, res: Response, next: NextFunction) => {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect("/login");
};

/**
 * Authorization Required middleware.
 * In the future, if the application will have another sign in strategy, we can use the provider.
 */
export const isAuthorized = (req: Request, res: Response, next: NextFunction) => {
    const provider = req.path.split("/").slice(-1)[0];

    const user = req.user as UserDocument;
    if (_.find(user.tokens, { kind: provider })) {
        next();
    } else {
        res.redirect(`/auth/${provider}`);
    }
};

export const isValidAccessToken = async (req: Request, res: Response, next: NextFunction) => {
    const provider = req.path.split("/").slice(-1)[0];
    const user = req.user as UserDocument;

    const token = _.find(user.tokens, { kind: provider });
    if (token && token.access_token_expires > new Date(Date.now())) {
        next();
    } else {
        if (provider == "truelayer") {
            const newToken: any = await trueLayerClient.refreshAccessToken(token.refreshToken).catch((err: Error) => {
                // RefreshToken is not valid
                res.redirect("/auth/truelayer");
            });

            await User.findById(user.id, async (err, existingUser: any) => {
                existingUser.tokens = existingUser.tokens.length > 0 ? existingUser.tokens.filter((token: AuthToken) => !token.kind.includes("truelayer")) : existingUser.tokens;
                existingUser.tokens.push({
                    kind: "truelayer",
                    access_token: newToken.access_token,
                    refreshToken: newToken.refresh_token,
                    access_token_expires: new Date(Date.now() + +TRUELAYER_ACCESSTOKEN_EXPIRES_TIME)
                });
                await existingUser.save((err: Error) => {
                    logger.error(err);
                    res.redirect("/");
                });
            });
            next();
        }
        res.redirect("/");
    }
};