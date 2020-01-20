/* eslint-disable @typescript-eslint/camelcase */
"use strict";

import { Response, Request, NextFunction } from "express";
import { UserDocument } from "../models/User";
import { Account, AccountDocument } from "../models/Account";
import { Transaction, TransactionDocument } from "../models/Transaction";
import { AuthAPIClient, DataAPIClient } from "truelayer-client";
import logger from "../util/logger";

const client = new AuthAPIClient({
    client_id: process.env["TRUELAYER_CLIENT_ID"],
    client_secret: process.env["TRUELAYER_CLIENT_SECRET"]
});

const scopes = ["info", "accounts", "balance", "cards", "transactions", "direct_debits", "standing_orders", "offline_access"];

/**
 * GET /api
 * List of API examples.
 */
export const getApi = (req: Request, res: Response) => {
    //TODO: You can use Swagger or OpenApi Url
    res.render("api/index", {
        title: "API Examples"
    });
};

/**
 * GET /api/truelayer
 * TrueLayer API
 */
export const getTrueLayerRedirect = (req: Request, res: Response) => {
    const authURL = client.getAuthUrl({
        scope: scopes,
        nonce: "default",
        redirectURI: process.env["TRUELAYER_REDIRECT_URL"],
        enableMock: true,
        enableOauth: true
    });

    return res.redirect(authURL);
};

export const getTrueLayerData = async (req: Request, res: Response, next: NextFunction) => {
    const user = req.user as UserDocument;
    //TODO BEFORE AccessTokenValidCheck
    const accounts = await DataAPIClient.getAccounts(user.tokens.find((token) => token.kind === "truelayer").access_token);
    Account.bulkWrite(
        accounts.results.map(
            (account: AccountDocument) => ({
                updateOne: {
                    filter: { accountId: account.account_id, user_id: user.id },
                    update: { $set: { ...account, user_id: user.id } },
                    upsert: true
                }
            })
        )
    );
    //TODO: Handle Promise
    await Promise.all(accounts.results.map(async item => {
        const transactions = await DataAPIClient.getTransactions(user.tokens.find((token) => token.kind === "truelayer").access_token, item.account_id);
        Transaction.bulkWrite(
            transactions.results.map(
                (transaction: TransactionDocument) => ({
                    updateOne: {
                        filter: { transactionId: transaction.transaction_id, user_id: user.id },
                        update: { $set: { ...transaction, account_id: item.account_id, user_id: user.id } },
                        upsert: true
                    }
                })
            )
        );
    })).catch(err => {
        logger.error(err);
        console.log(err);
    });

    res.redirect("/");
};

export const getAccounts = (req: Request, res: Response, next: NextFunction) => {
    Account.find({})
        .exec((err, accounts: AccountDocument) => {
            if (err) { logger.error(err); return next(err); }
            if (!accounts) {
                req.flash("info", { msg: "No account find." });
                next(err);
            }
            res.json(accounts);
        });
};

export const getAccount = (req: Request, res: Response, next: NextFunction) => {
    Account.findById(req.params.id, (err, account: AccountDocument) => {
        if (err) { logger.error(err); return next(err); }
        if (!account) {
            req.flash("info", { msg: "No account find." });
            next(err);
        }
        res.json(account);
    });
};

export const getAccountsByUserId = (req: Request, res: Response, next: NextFunction) => {
    Account.find({ user_id: req.params.id })
        .exec((err, accounts: AccountDocument) => {
            if (err) { logger.error(err); return next(err); }
            if (!accounts) {
                req.flash("info", { msg: "No account find." });
                next(err);
            }
            res.json(accounts);
        });
};

export const getTransactions = (req: Request, res: Response, next: NextFunction) => {
    Transaction.find({})
        .exec((err, transactions: TransactionDocument) => {
            if (err) { logger.error(err); return next(err); }
            if (!transactions) {
                req.flash("info", { msg: "No transaction find." });
                next(err);
            }
            res.json(transactions);
        });
};

export const getTransaction = (req: Request, res: Response, next: NextFunction) => {
    Transaction.findById(req.params.id, (err, transaction: TransactionDocument) => {
        if (err) { logger.error(err); return next(err); }
        if (!transaction) {
            req.flash("info", { msg: "No transaction find." });
            next(err);
        }
        res.json(transaction);
    });
};

export const getTransactionsByUserId = (req: Request, res: Response, next: NextFunction) => {
    Transaction.find({ user_id: req.params.id })
        .exec((err, transactions: TransactionDocument) => {
            if (err) { logger.error(err); return next(err); }
            if (!transactions) {
                req.flash("info", { msg: "No transaction find." });
                next(err);
            }
            res.json(transactions);
        });
};