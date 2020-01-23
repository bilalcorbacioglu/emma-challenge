import request from "supertest";
import app from "../src/app";

describe("GET /api", () => {
    it("should return 200 OK", () => {
        return request(app).get("/api")
            .expect(200);
    });
});

describe("GET /auth/truelayer", () => {
    it("should return 302 Redirection", () => {
        return request(app).get("/auth/truelayer")
            .expect(302);
    });
});

describe("GET /api/transactions", () => {
    it("should return 302 Redirection", () => {
        return request(app).get("/api/transactions")
            .expect(302);
    });
});

describe("GET /api/accounts", () => {
    it("should return 302 Redirection", () => {
        return request(app).get("/api/accounts")
            .expect(302);
    });
});

describe("GET /api/transactions/:Id", () => {
    it("should return 302 Redirection", () => {
        return request(app).get("/api/transactions/5e248b217f6dc087c183b624")
            .expect(302);
    });
});

describe("GET /api/accounts/:Id", () => {
    it("should return 302 Redirection", () => {
        return request(app).get("/api/accounts/5e248b217f6dc087c183b624")
            .expect(302);
    });
});


describe("GET /api/user/:userId/transactions/groupByAccount", () => {
    it("should return 302 Redirection", () => {
        return request(app).get("/api/user/5e248b217f6dc087c183b624/transactions/groupByAccount")
            .expect(302);
    });
});

describe("GET /api/user/:userId/transactions", () => {
    it("should return 302 Redirection", () => {
        return request(app).get("/api/user/5e248b217f6dc087c183b624/transactions")
            .expect(302);
    });
});

describe("GET /api/user/:userId/accounts", () => {
    it("should return 302 Redirection", () => {
        return request(app).get("/api/user/5e248b217f6dc087c183b624/accounts")
            .expect(302);
    });
});

describe("GET /api/truelayer/:userId/test", () => {
    it("should return 302 Redirection", () => {
        return request(app).get("/api/truelayer/5e248b217f6dc087c183b624/test")
            .expect(302);
    });
});

describe("GET /reset", () => {
    it("should return 302 Found for redirection", () => {
        return request(app).get("/reset/1")
            .expect(302);
    });
});