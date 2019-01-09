"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
let id = 0;
;
const examples = [
    { id: id++, name: 'example 0' },
    { id: id++, name: 'example 1' }
];
class ExamplesService {
    all() {
        return Promise.resolve(examples);
    }
    byId(id) {
        return this.all().then(r => r[id]);
    }
    create(name) {
        const example = {
            id: id++,
            name
        };
        examples.push(example);
        return Promise.resolve(example);
    }
}
exports.ExamplesService = ExamplesService;
exports.default = new ExamplesService();
//# sourceMappingURL=examples.service.js.map