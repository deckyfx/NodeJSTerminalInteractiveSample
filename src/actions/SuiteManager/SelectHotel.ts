import SabreHotel from "../../models/SabreHotel";
import SabreCity from "../../models/SabreCity";
import TerminalFlow from "./TerminalFlow";
import mongo, { MongoDB } from "../../MongoDB";
import Util from "../../Util";
import { InquirerSelectHotelAnswer } from "../../repositories/hotelrepository/InquirerAnswer";
import FlowDirection from "./FlowDirection";
import _ = require("lodash");

export default class SelectHotel {
    public resolvedHotel: Array<SabreHotel> = [];
    
    constructor(public city?: SabreCity, private stripSuiteThatHasImage?: boolean) {
    }

    public Resolve(): Promise<TerminalFlow<SabreHotel>> {
        return this.selectHotel()
        .then((flow) => {
            switch (flow.direction) {
                case FlowDirection.NEXT: {
                    return Promise.resolve(new TerminalFlow<SabreHotel>(FlowDirection.NEXT, flow.data!));
                };
                case FlowDirection.PREVIOUS: {
                    return Promise.resolve(new TerminalFlow<SabreHotel>(FlowDirection.PREVIOUS));
                };
            }
            return Promise.reject("Unhandled flow");
        });
    }

    private selectHotel(): Promise<TerminalFlow<SabreHotel>> {
        return mongo.connect()
        .then((mongo: MongoDB) => {
            if (this.resolvedHotel.length == 0) {
                Util.vorpal.log(`Search hotels in city "${Util.printValue(this.city!.get("_id"))}"...`);
                Util.spinner.start();
                return new Promise<SabreHotel[]>((resolve, reject) => {
                    let searchcondition: any = { $and: [ { city: new RegExp(this.city!.get("_id"), "i") }, { sabreID: { $exists: true } } ] };
                    if (this.stripSuiteThatHasImage) {
                        searchcondition = { $and: [ 
                            { city: new RegExp(this.city!.get("_id"), "i") }, 
                            { sabreID: { $exists: true } },
                            { suites: { $elemMatch : { $and : [ { images : { $size : 0 } } , { sabreID : { $exists : true } } ] } } }
                        ] }
                    }
                    mongo.models.SabreHotel!.find(searchcondition, (e, docs) => {
                        if (e) return resolve([]);
                        this.resolvedHotel = docs;
                        return resolve(docs);
                    })
                })
            } else {
                Util.vorpal.log(`Using cached search hotels result`);
                return Promise.resolve(this.resolvedHotel);
            }
        })
        .then((hotels) => {
            Util.spinner.stop();
            Util.vorpal.log(`${Util.printWarning()} Multiple hotel found with current mongo search logic:`);
            hotels = _.sortBy(hotels, ["name", "sabreName"], ["asc", "asc"]);
            let choices: Array<any> = new Array<any>();
            choices.push(new InquirerSelectHotelAnswer("Return to previous screen", -1));
            choices.push(new Util.inquirer.Separator());
            choices = _.concat(choices, _.map(hotels, (hotel) => {
                return new InquirerSelectHotelAnswer("", hotel, true, this.stripSuiteThatHasImage);
            }));
            choices.push(new Util.inquirer.Separator());
            return Util.prompt<InquirerSelectHotelAnswer>({
                type: 'list',
                message: "Select hotel you want to update",
                name: 'value',
                choices: choices,
                pageSize: 15,
                default: (choices.length - 2)
            }).then((answer) => {
                let val = answer.value!;
                if ( typeof(val) === "number" ) {
                    let choice = val as number;
                    switch (choice) {
                        default: {
                            return Promise.resolve(new TerminalFlow<SabreHotel>(FlowDirection.PREVIOUS));
                        } break;
                    }
                } else {
                    let val = answer.value! as SabreHotel;
                    Util.vorpal.log(`Update hotel ${Util.printValue(val.get("sabreName"))}`);
                    return Promise.resolve(new TerminalFlow<SabreHotel>(FlowDirection.NEXT, val));
                }
            });
        })
    }
}