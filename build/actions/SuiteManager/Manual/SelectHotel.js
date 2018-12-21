"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TerminalFlow_1 = require("../TerminalFlow");
const MongoDB_1 = require("../../../MongoDB");
const Util_1 = require("../../../Util");
const InquirerAnswer_1 = require("../../../repositories/hotelrepository/InquirerAnswer");
const FlowDirection_1 = require("../FlowDirection");
const _ = require("lodash");
class SelectHotel {
    constructor(city) {
        this.city = city;
    }
    Resolve() {
        return this.selectHotel()
            .then((flow) => {
            switch (flow.direction) {
                case FlowDirection_1.default.NEXT:
                    {
                        return Promise.resolve(new TerminalFlow_1.default(FlowDirection_1.default.NEXT, flow.data));
                    }
                    ;
                case FlowDirection_1.default.PREVIOUS:
                    {
                        return Promise.resolve(new TerminalFlow_1.default(FlowDirection_1.default.PREVIOUS));
                    }
                    ;
            }
            return Promise.reject("Unhandled flow");
        });
    }
    selectHotel() {
        return MongoDB_1.default.connect()
            .then((mongo) => {
            Util_1.default.vorpal.log(`Search hotels in city "${Util_1.default.printValue(this.city.get("_id"))}"...`);
            Util_1.default.spinner.start();
            return new Promise((resolve, reject) => {
                let searchcondition = { $and: [{ city: new RegExp(this.city.get("_id"), "i") }, { sabreID: { $exists: true } }] };
                mongo.models.SabreHotel.find(searchcondition, (e, docs) => {
                    if (e)
                        return resolve([]);
                    return resolve(docs);
                });
            });
        })
            .then((hotels) => {
            Util_1.default.spinner.stop();
            Util_1.default.vorpal.log(`${Util_1.default.printWarning()} Multiple hotel found with current mongo search logic:`);
            hotels = _.sortBy(hotels, ["name", "sabreName"], ["asc", "asc"]);
            let choices = new Array();
            choices.push(new InquirerAnswer_1.InquirerSelectHotelAnswer("Return to previous screen", -1));
            choices.push(new Util_1.default.inquirer.Separator());
            choices = _.concat(choices, _.map(hotels, (hotel) => {
                return new InquirerAnswer_1.InquirerSelectHotelAnswer("", hotel, true, true);
            }));
            choices.push(new Util_1.default.inquirer.Separator());
            return Util_1.default.prompt({
                type: 'list',
                message: "Select hotel you want to update",
                name: 'value',
                choices: choices,
                pageSize: 15,
                default: (choices.length - 2)
            }).then((answer) => {
                let val = answer.value;
                if (typeof (val) === "number") {
                    let choice = val;
                    switch (choice) {
                        default:
                            {
                                return Promise.resolve(new TerminalFlow_1.default(FlowDirection_1.default.PREVIOUS));
                            }
                            break;
                    }
                }
                else {
                    let val = answer.value;
                    Util_1.default.vorpal.log(`Update hotel ${Util_1.default.printValue(val.get("sabreName"))}`);
                    return Promise.resolve(new TerminalFlow_1.default(FlowDirection_1.default.NEXT, val));
                }
            });
        });
    }
}
exports.default = SelectHotel;
//# sourceMappingURL=SelectHotel.js.map