"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TerminalFlow_1 = require("./../TerminalFlow");
const FlowDirection_1 = require("./../FlowDirection");
const InquirerAnswer_1 = require("../../../repositories/hotelrepository/InquirerAnswer");
const Util_1 = require("../../../Util");
const _ = require("lodash");
class SelectSuite {
    constructor(hotel) {
        this.hotel = hotel;
    }
    Resolve() {
        return this.selectSuite()
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
    selectSuite() {
        let choices = new Array();
        choices.push(new InquirerAnswer_1.InquirerSelectHotelAnswer("Return to previous screen", -2));
        choices.push(new InquirerAnswer_1.InquirerSelectHotelAnswer("Working with this Hotel", -1));
        choices.push(new Util_1.default.inquirer.Separator());
        let suites = this.hotel.get("suites");
        let i = 0;
        choices = _.concat(choices, _.map(suites, (suite) => {
            i++;
            return new InquirerAnswer_1.InquirerSelectSuiteAnswer("", suite, i - 1);
        }));
        choices.push(new Util_1.default.inquirer.Separator());
        return Util_1.default.prompt({
            type: 'list',
            message: "Select suite you want to update",
            name: 'value',
            choices: choices,
            pageSize: 15,
            default: (choices.length - 2)
        }).then((answer) => {
            let val = answer.value;
            if (typeof (val) === "number") {
                let choice = val;
                switch (choice) {
                    case -1:
                        {
                            Util_1.default.vorpal.log(`Working with hotel: ${Util_1.default.printValue(this.hotel.get("name"))}`);
                            return Promise.resolve(new TerminalFlow_1.default(FlowDirection_1.default.NEXT));
                        }
                        break;
                    default:
                        {
                            return Promise.resolve(new TerminalFlow_1.default(FlowDirection_1.default.PREVIOUS));
                        }
                        break;
                }
            }
            else {
                let val = answer.value;
                Util_1.default.vorpal.log(`Update suite ${Util_1.default.printValue(val.get("name"))}`);
                return Promise.resolve(new TerminalFlow_1.default(FlowDirection_1.default.NEXT, val));
            }
        });
    }
}
exports.default = SelectSuite;
//# sourceMappingURL=SelectSuite.js.map