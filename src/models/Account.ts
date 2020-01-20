/* eslint-disable @typescript-eslint/camelcase */
import mongoose from "mongoose";
import { IAccount } from "truelayer-client";

export type AccountDocument = mongoose.Document & IAccount & {
    user_id: string;
};

const accountSchema = new mongoose.Schema({
    account_id: String,
    account_number: Object,
    account_type: String,
    currency: String,
    description: String,
    displayName: String,
    provider: Object,
    update_timestamp: Date,
    user_id: { type: String, ref: "User" }
}, { timestamps: true });

export const Account = mongoose.model<AccountDocument>("Account", accountSchema);
