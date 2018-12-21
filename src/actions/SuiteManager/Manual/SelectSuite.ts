import SabreHotel from "../../../models/SabreHotel";
import TerminalFlow from "./../TerminalFlow";
import SabreSuite from "../../../models/SabreSuite";
import FlowDirection from "./../FlowDirection";
import { InquirerSelectHotelAnswer, InquirerSelectSuiteAnswer } from "../../../repositories/hotelrepository/InquirerAnswer";
import Util from "../../../Util";
import _ = require("lodash");

export default class SelectSuite {
    constructor(public hotel: SabreHotel) {
    }

    public Resolve(): Promise<TerminalFlow<SabreSuite>> {
        return this.selectSuite()
        .then((flow) => {
            switch (flow.direction) {
                case FlowDirection.NEXT: {
                    return Promise.resolve(new TerminalFlow<SabreSuite>(FlowDirection.NEXT, flow.data!));
                };
                case FlowDirection.PREVIOUS: {
                    return Promise.resolve(new TerminalFlow<SabreSuite>(FlowDirection.PREVIOUS));
                };
            }
            return Promise.reject("Unhandled flow");
        })
    }

    private selectSuite(): Promise<TerminalFlow<SabreSuite>> {
        let choices: Array<any> = new Array<any>();
        choices.push(new InquirerSelectHotelAnswer("Return to previous screen", -2));
        choices.push(new InquirerSelectHotelAnswer("Working with this Hotel", -1));
        choices.push(new Util.inquirer.Separator());
        let suites: SabreSuite[] = this.hotel.get("suites");
        let i = 0;
        choices = _.concat(choices, _.map(suites, (suite) => {
            i++
            return new InquirerSelectSuiteAnswer("", suite, i - 1);
        }));
        choices.push(new Util.inquirer.Separator());
        return Util.prompt<InquirerSelectSuiteAnswer>({
            type: 'list',
            message: "Select suite you want to update",
            name: 'value',
            choices: choices,
            pageSize: 15,
            default: (choices.length - 2)
        }).then((answer) => {
            let val = answer.value!;
            if ( typeof(val) === "number" ) {
                let choice = val as number;
                switch (choice) {
                    case -1: {
                        Util.vorpal.log(`Working with hotel: ${Util.printValue(this.hotel.get("name"))}`);
                        return Promise.resolve(new TerminalFlow<SabreSuite>(FlowDirection.NEXT));
                    } break;
                    default: {
                        return Promise.resolve(new TerminalFlow<SabreSuite>(FlowDirection.PREVIOUS));
                    } break;
                }
            } else {
                let val = answer.value! as SabreSuite;
                Util.vorpal.log(`Update suite ${Util.printValue(val.get("name"))}`);
                return Promise.resolve(new TerminalFlow<SabreSuite>(FlowDirection.NEXT, val));
            }
        });
    }
}