# Emma Challange [![CodeFactor](https://www.codefactor.io/repository/github/bilalcorbacioglu/emma-challenge/badge)](https://www.codefactor.io/repository/github/bilalcorbacioglu/emma-challenge)

## Targets

- Handling the user authentication flow with TrueLayer (**Endpoint: /auth/truelayer**)
- After the login, fetch and store the transactions on a relational database (**I used non-relational (Mongo)**)
- Have and endpoint that given a user ID returns all of the users transactions grouped by account (**Endpoint: /api/user/{userId}/transactions/groupByAccount** )
- Have and endpoint that, given a user ID, attempts to call again each of the TrueLayer endpoints that were used to fetch information in (2) and returns debug information about the API calls (**Endpoint: /api/truelayer/{userId}/test**)

### Tech Stack & Features
- TypeScript
- User Auth without Truelayer(Passport.js) and with Truelayer (Can link after login to truelayer - Sync)
- OpenApi (Swagger) (**Endpoint: /explorer/**)
- Docker (Not finished yet Branch: Dev/docker)
- Test (Jest)
- Logging system (**./debug.log**)
- Email Operation with SendGrid
- Authenticate & Authorize Check Middleware
- Truelayer Accesstoken check and regenerate with the refresh token (if possible)
- Eslint

## Run & Test

Node Version -> 12

#### Run
```bash
$ npm install
```
```bash
$ npm run build
$ npm run start
```
#### Test
```bash
$ npm test
```
## Notes

- **Please make sure that Truelayer ( [Truelayer Status](https://status.truelayer.com/) ) operations are working properly before starting.**
- If you login directly via Truelayer, the first email from the service( Truelayer Endpoint: /info ) is used when creating the user account.
- After logging in with Truelayer, you can set a password if you want and choose that login method.
- If you are connected to Truelayer with your user, it synchronizes the data after each login. (**Endpoint: /api/truelayer**)
- You can create a user account using local methods, then Link to the Truelayer in My Accounts and synchronize your data.
- For detailed endpoint descriptions please visit, (**Endpoint: /explorer**)
- The configuration is managed by the **.etc** file. You can perform Truelayer Sandbox information or database connection settings from there.
- You are expected to log in to the system to call most endpoints. You can remove it if you wish ( **passportConfig.isAuthenticated** )