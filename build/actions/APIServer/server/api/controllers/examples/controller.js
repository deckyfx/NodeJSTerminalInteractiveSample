"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const examples_service_1 = require("../../services/examples.service");
class Controller {
    all(req, res) {
        examples_service_1.default.all().then((r) => res.json(r));
    }
    byId(req, res) {
        examples_service_1.default.byId(req.params.id).then((r) => {
            if (r)
                res.json(r);
            else
                res.status(404).end();
        });
    }
    create(req, res) {
        examples_service_1.default.create(req.body.name).then((r) => res
            .status(201)
            .location(`<%= apiRoot %>/examples/${r.id}`)
            .json(r));
    }
}
exports.Controller = Controller;
exports.default = new Controller();
//# sourceMappingURL=controller.js.map