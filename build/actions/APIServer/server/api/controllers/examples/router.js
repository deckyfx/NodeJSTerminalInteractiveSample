"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express = require("express");
const controller_1 = require("./controller");
exports.default = express.Router()
    .post('/', controller_1.default.create)
    .get('/', controller_1.default.all)
    .get('/:id', controller_1.default.byId);
//# sourceMappingURL=router.js.map