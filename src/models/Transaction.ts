/* eslint-disable @typescript-eslint/camelcase */
import mongoose from "mongoose";
import { ITransaction } from "truelayer-client";

export type TransactionDocument = mongoose.Document & ITransaction & {
    account_id: string;
    user_id: string;
};

const transactionSchema = new mongoose.Schema({
    amount: Number,
    currency: String,
    description: String,
    transaction_id: String,
    meta: Object,
    timestamp: String,
    transaction_type: String,
    transaction_category: String,
    account_id: { type: String, ref: "Account" },
    user_id: { type: String, ref: "User" }
}, { timestamps: true });

export const Transaction = mongoose.model<TransactionDocument>("Transaction", transactionSchema);
