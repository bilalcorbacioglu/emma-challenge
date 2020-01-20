/* eslint-disable @typescript-eslint/camelcase */
import bcrypt from "bcrypt-nodejs";
import crypto from "crypto";
import mongoose from "mongoose";
import {BCRYPT_ROUND} from "../util/secrets";

export type UserDocument = mongoose.Document & {
    email: string;
    password: string;
    password_reset_token: string;
    password_reset_expires: Date;
    tokens: AuthToken[];
    profile: {
        name: string;
        location: string;
        picture: string;
    };

    comparePassword: comparePasswordFunction;
    gravatar: (size: number) => string;
};

type comparePasswordFunction = (candidatePassword: string, cb: (err: any, isMatch: any) => {}) => void;

export interface AuthToken {
    access_token: string;
    refreshToken: string;
    kind: string;
    access_token_expires: Date;
}

const userSchema = new mongoose.Schema({
    email: { type: String, unique: true },
    password: String,
    password_reset_token: String,
    password_reset_expires: Date,
    tokens: Array,
    profile: {
        name: String,
        location: String,
        picture: String
    }
}, { timestamps: true });

/**
 * Password hash middleware.
 */
userSchema.pre("save", function save(next) {
    const user = this as UserDocument;
    if (!user.isModified("password")) { return next(); }
    bcrypt.genSalt(+BCRYPT_ROUND, (err, salt) => {
        if (err) { return next(err); }
        bcrypt.hash(user.password, salt, undefined, (err: mongoose.Error, hash) => {
            if (err) { return next(err); }
            user.password = hash;
            next();
        });
    });
});

const comparePassword: comparePasswordFunction = function (candidatePassword, cb) {
    bcrypt.compare(candidatePassword, this.password, (err: mongoose.Error, isMatch: boolean) => {
        cb(err, isMatch);
    });
};

userSchema.methods.comparePassword = comparePassword;

/**
 * Helper method for getting user's gravatar.
 */
userSchema.methods.gravatar = function (size: number = 200) {
    if (!this.email) {
        return `https://gravatar.com/avatar/?s=${size}&d=retro`;
    }
    const md5 = crypto.createHash("md5").update(this.email).digest("hex");
    return `https://gravatar.com/avatar/${md5}?s=${size}&d=retro`;
};

export const User = mongoose.model<UserDocument>("User", userSchema);
