"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const path = require("path");
const router_1 = require("./api/controllers/examples/router");
const publicdir = path.join(__dirname, 'public');
function routes(app) {
    app.use('/api/v1/examples', router_1.default);
    app.get('/', function (req, res) {
        res.sendFile(path.join(publicdir, 'index.html'));
    });
}
exports.default = routes;
;
//# sourceMappingURL=routes.js.map