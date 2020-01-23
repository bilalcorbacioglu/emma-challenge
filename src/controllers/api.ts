/* eslint-disable prefer-const */
/* eslint-disable @typescript-eslint/camelcase */
"use strict";

import { performance } from "perf_hooks";
import { Response, Request, NextFunction } from "express";
import { UserDocument, User, AuthToken } from "../models/User";
import { Account, AccountDocument } from "../models/Account";
import { Transaction, TransactionDocument } from "../models/Transaction";
import { AuthAPIClient, DataAPIClient } from "truelayer-client";
import { TruelayerServiceTest, ApiCall } from "../types/trueLayerServiceTest";
import { TRUELAYER_ACCESSTOKEN_EXPIRES_TIME } from "../util/secrets";
import _ from "lodash";

import logger from "../util/logger";
import {USER_NOT_AUTHORIZED, USER_INVALID_AUTHORIZED } from "../util/errorMessages";

const client = new AuthAPIClient({
    client_id: process.env["TRUELAYER_CLIENT_ID"],
    client_secret: process.env["TRUELAYER_CLIENT_SECRET"]
});

const scopes = ["info", "accounts", "balance", "cards", "transactions", "direct_debits", "standing_orders", "offline_access"];

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
    const userFromFlow = req.user as UserDocument;

    const user = await User.findById(userFromFlow.id, async (err, user) => {
        if (err)
            next(err);

        return user;
    });

    const accounts: any = await DataAPIClient.getAccounts(user.tokens.find((token) => token.kind === "truelayer").access_token).catch((err: Error) => {
        logger.error(err);
        res.redirect("/");
    });
    Account.bulkWrite(
        accounts.results.map(
            (account: AccountDocument) => ({
                updateOne: {
                    filter: { user_id: user.id, accountId: account.account_id },
                    update: { $set: { ...account, user_id: user.id } },
                    upsert: true
                }
            })
        )
    );

    await Promise.all(accounts.results.map(async (item: { account_id: string }) => {
        const transactions: any = await DataAPIClient.getTransactions(user.tokens.find((token) => token.kind === "truelayer").access_token, item.account_id).catch((err: Error) => {
            logger.error(err);
            res.redirect("/");
        });
        Transaction.bulkWrite(
            transactions.results.map(
                (transaction: TransactionDocument) => ({
                    updateOne: {
                        filter: { user_id: user.id, transactionId: transaction.transaction_id },
                        update: { $set: { ...transaction, account_id: item.account_id, user_id: user.id } },
                        upsert: true
                    }
                })
            )
        );
    })).catch(err => {
        logger.error(err);
    });

    res.redirect("/");
};


const apiCalls: any = async (endpoint: string, accessToken: string ) => {
    //Default Value
    let apiCall: ApiCall = {
        req_status:true,
        endpoint:"",
        time: 0
    };
    let runtime=0;
    switch(endpoint) {
        case "/Me":
            runtime = performance.now();
            await DataAPIClient.getMe(accessToken).catch((err: Error)=> {
                apiCall.req_status = false;
                apiCall.error = err;
            }).finally(() => {
                apiCall.time = performance.now() - runtime;
                apiCall.endpoint = "/Me";
            });
            break;
        case "/Info":
            runtime = performance.now();
            await DataAPIClient.getInfo(accessToken).catch((err: Error)=> {
                apiCall.req_status = false;
                apiCall.error = err;
            }).finally(() => {
                apiCall.time = performance.now() - runtime;
                apiCall.endpoint = "/Info";
            });
            break;
        case "/Accounts":
            runtime = performance.now();
            await DataAPIClient.getAccounts(accessToken).catch((err: Error)=> {
                apiCall.req_status = false;
                apiCall.error = err;
            }).finally(() => {
                apiCall.time = performance.now() - runtime;
                apiCall.endpoint = "/Accounts";
            });
            break;
    }
    return apiCall;
};

export const getTrueLayerServiceTest = async (req: Request, res: Response, next: NextFunction) => {
    const userId = req.params.userId;
    let response: TruelayerServiceTest = {
        access_token_valid: true,
        refresh_token_valid: true,
        created_date: new Date(),
        api_calls: []
    };

    //User Validation
    const user = await User.findById(userId, async (err, user) => {
        if (err)
            next(err);

        return user;
    });

    //Token Validation
    let token = _.find(user.tokens, { kind: "truelayer" });
    if (!token) {
        response.access_token_valid = false;
        response.refresh_token_valid = false;
        response.message = USER_NOT_AUTHORIZED;
        res.json(response);
    } else if (token.access_token_expires < new Date(Date.now())) {
        const newToken: any = await client.refreshAccessToken(token.refreshToken).catch((err: Error) => {
            response.access_token_valid = false;
            response.refresh_token_valid = false;
            response.message = USER_INVALID_AUTHORIZED;
            res.json(response);
        });
        if(newToken) {
            token = newToken;
            await User.findById(user.id, async (err, existingUser: any) => {
                existingUser.tokens = existingUser.tokens.length > 0 ? existingUser.tokens.filter((token: AuthToken) => !token.kind.includes("truelayer")) : existingUser.tokens;
                existingUser.tokens.push({
                    kind: "truelayer",
                    access_token: newToken.access_token,
                    refreshToken: newToken.refresh_token,
                    access_token_expires: new Date(Date.now() + +TRUELAYER_ACCESSTOKEN_EXPIRES_TIME)
                });
                await existingUser.save((err: Error) => {
                    if(err)
                        logger.error(err);
                });
            });
        }
    }

    //API Calls
    // We can add another endpoint.
    const trueLayerEndpoints: string[] = ["/Me", "/Info", "/Accounts"];

    for (const trueLayerEndpoint of trueLayerEndpoints) {
        await apiCalls(trueLayerEndpoint, token.access_token).then((res: any) => {
            response.api_calls.push(res);
        });
    }
    res.json(response);
};

export const getAccounts = (req: Request, res: Response, next: NextFunction) => {
    Account.find({})
        .exec((err, accounts: AccountDocument) => {
            if (err) { logger.error(err); return next(err); }
            res.json(accounts);
        });
};

export const getAccount = (req: Request, res: Response, next: NextFunction) => {
    Account.findById(req.params.id, (err, account: AccountDocument) => {
        if (err) { logger.error(err); return next(err); }
        res.json(account);
    });
};

export const getAccountsByUserId = (req: Request, res: Response, next: NextFunction) => {
    Account.find({ user_id: req.params.id })
        .exec((err, accounts: AccountDocument) => {
            if (err) { logger.error(err); return next(err); }
            res.json(accounts);
        });
};

export const getTransactions = (req: Request, res: Response, next: NextFunction) => {
    Transaction.find({})
        .exec((err, transactions: TransactionDocument) => {
            if (err) { logger.error(err); return next(err); }
            res.json(transactions);
        });
};

export const getTransaction = (req: Request, res: Response, next: NextFunction) => {
    Transaction.findById(req.params.id, (err, transaction: TransactionDocument) => {
        if (err) { logger.error(err); return next(err); }
        res.json(transaction);
    });
};

export const getTransactionsByUserId = (req: Request, res: Response, next: NextFunction) => {
    Transaction.find({ user_id: req.params.id })
        .exec((err, transactions: TransactionDocument) => {
            if (err) { logger.error(err); return next(err); }
            res.json(transactions);
        });
};

export const getTransactionsGroupByAccount = (req: Request, res: Response, next: NextFunction) => {
    const userId = req.params.id;
    
    Transaction.aggregate([
        {
            $match: { 
                "user_id": {"$regex": userId}
            }
        },
        {
            $group: {
                _id: "$account_id",
                obj: { $push: "$$ROOT" }
            }
        }
    ]).exec((err, result)=>{
        if(err) return next(err);
        res.json(result);
    });

};
