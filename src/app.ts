import express from "express";
import compression from "compression";  // compresses requests
import session from "express-session";
import bodyParser from "body-parser";
import lusca from "lusca";
import mongo from "connect-mongo";
import flash from "express-flash";
import path from "path";
import mongoose from "mongoose";
import passport from "passport";
import bluebird from "bluebird";
import { MONGODB_URI, SESSION_SECRET } from "./util/secrets";
import logger from "./util/logger";

import swaggerUi from "swagger-ui-express";
import swaggerDocument from "./swagger.json";
const MongoStore = mongo(session);

// Controllers (route handlers)
import * as homeController from "./controllers/home";
import * as userController from "./controllers/user";
import * as apiController from "./controllers/api";

// API keys and Passport configuration
import * as passportConfig from "./config/passport";

// Create Express server
const app = express();

// Connect to MongoDB
const mongoUrl = MONGODB_URI;
mongoose.Promise = bluebird;

mongoose.connect(mongoUrl, { useNewUrlParser: true, useCreateIndex: true, useUnifiedTopology: true }).then(
    () => { /** ready to use. The `mongoose.connect()` promise resolves to undefined. */ },
).catch(err => {
    logger.error(err);
    console.log("MongoDB connection error. Please make sure MongoDB is running. " + err);
    process.exit();
});

// Express configuration
app.set("port", process.env.PORT || 3000);
app.set("views", path.join(__dirname, "../views"));
app.set("view engine", "pug");
app.use(compression());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    resave: true,
    saveUninitialized: true,
    secret: SESSION_SECRET,
    store: new MongoStore({
        url: mongoUrl,
        autoReconnect: true
    })
}));
app.use(passport.initialize());
app.use(passport.session());
app.use(flash());
app.use(lusca.xframe("SAMEORIGIN"));
app.use(lusca.xssProtection(true));
app.use((req, res, next) => {
    res.locals.user = req.user;
    next();
});
app.use((req, res, next) => {
    // After successful login, redirect back to the intended page
    if (!req.user &&
        req.path !== "/login" &&
        req.path !== "/signup" &&
        !req.path.match(/^\/auth/) &&
        !req.path.match(/\./)) {
        req.session.returnTo = req.path;
    } else if (req.user &&
        req.path == "/user") {
        req.session.returnTo = req.path;
    }
    next();
});

app.use(
    express.static(path.join(__dirname, "public"), { maxAge: 31557600000 })
);

/**
 * Primary app routes.
 */
app.get("/", homeController.index);
app.get("/login", userController.getLogin);
app.post("/login", userController.postLogin);
app.get("/logout", userController.logout);
app.get("/forgot", userController.getForgot);
app.post("/forgot", userController.postForgot);
app.get("/reset/:token", userController.getReset);
app.post("/reset/:token", userController.postReset);
app.get("/signup", userController.getSignup);
app.post("/signup", userController.postSignup);
app.get("/user", passportConfig.isAuthenticated, userController.getUser);
app.post("/user/profile", passportConfig.isAuthenticated, userController.postUpdateProfile);
app.post("/user/password", passportConfig.isAuthenticated, userController.postUpdatePassword);
app.post("/user/delete", passportConfig.isAuthenticated, userController.postDeleteUser);
app.get("/user/unlink/:provider", passportConfig.isAuthenticated, userController.getOauthUnlink);

/**
 * API routes.
 */
app.get("/api/accounts", passportConfig.isAuthenticated, apiController.getAccounts);
app.get("/api/accounts/:id", passportConfig.isAuthenticated, apiController.getAccount);

app.get("/api/transactions", passportConfig.isAuthenticated, apiController.getTransactions);
app.get("/api/transactions/:id", passportConfig.isAuthenticated, apiController.getTransaction);

app.get("/api/user/:id/transactions", passportConfig.isAuthenticated, apiController.getTransactionsByUserId);
app.get("/api/user/:id/accounts", passportConfig.isAuthenticated, apiController.getAccountsByUserId);
app.get("/api/user/:id/transactions/groupByAccount", passportConfig.isAuthenticated, apiController.getTransactionsGroupByAccount);

/**
 * External Service Request
 */

app.get("/api/truelayer", passportConfig.isAuthenticated, passportConfig.isAuthorized, passportConfig.isValidAccessToken, apiController.getTrueLayerData);
app.get("/api/truelayer/:userId/test", passportConfig.isAuthenticated, apiController.getTrueLayerServiceTest);

/**
 * OAuth authentication routes. (Sign in - TrueLayer)
 */

app.get("/auth/truelayer", apiController.getTrueLayerRedirect);
app.get("/auth/truelayer/callback", passport.authenticate("truelayer", { failureRedirect: "/login" }), (req, res) => {
    res.redirect("/api/truelayer");
});

/**
 * Swagger
 */

app.use("/explorer", swaggerUi.serve, swaggerUi.setup(swaggerDocument));

export default app;
