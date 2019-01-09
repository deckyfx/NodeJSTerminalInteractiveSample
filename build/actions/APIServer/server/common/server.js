"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const path = require("path");
const bodyParser = require("body-parser");
const http = require("http");
const cookieParser = require("cookie-parser");
const Util_1 = require("../../../../Util");
const app = express();
class ExpressServer {
    constructor() {
        const root = path.normalize(__dirname + '/../..');
        app.set('appPath', root + 'client');
        app.use(bodyParser.json({ limit: process.env.REQUEST_LIMIT || '100kb' }));
        app.use(bodyParser.urlencoded({ extended: true, limit: process.env.REQUEST_LIMIT || '100kb' }));
        app.use(cookieParser(process.env.SESSION_SECRET));
        app.use(express.static(`${root}/public`));
    }
    router(routes) {
        routes(app);
        return this;
    }
    listen(p = 3000) {
        const welcome = (port) => () => Util_1.default.vorpal.log(`Server ready on port ${port}`);
        http.createServer(app).listen(p, welcome(p));
        return app;
    }
}
exports.default = ExpressServer;
//# sourceMappingURL=server.js.map