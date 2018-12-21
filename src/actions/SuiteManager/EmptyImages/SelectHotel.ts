import SabreHotel from "../../../models/SabreHotel";
import TerminalFlow from "../TerminalFlow";
import mongo, { MongoDB } from "../../../MongoDB";
import Util from "../../../Util";
import { InquirerSelectHotelAnswer } from "../../../repositories/hotelrepository/InquirerAnswer";
import FlowDirection from "../FlowDirection";
import _ = require("lodash");

export default class SelectHotel {
    public Resolve(): Promise<TerminalFlow<SabreHotel>> {
        return this.SearchHotels();
    }

    private SearchHotels() : Promise<TerminalFlow<SabreHotel>>{
        return mongo.connect()
        .then((mongo: MongoDB) => {
            Util.vorpal.log(`Search for hotels that has 0 images or suites with 0 images...`);
            Util.spinner.start();
            return new Promise<SabreHotel[]>((resolve, reject) => {
                let search_condition = { $or: [ {$and: [ 
                    { suites : { $elemMatch : { $and : [ { images : { $size: 0 } } , { sabreID : { $exists : true } } ] } } }, 
                    { sabreID : { $exists : true } } 
                ] }, { images : { $size: 0 } } ] };
                mongo.models.Hotel!.find(search_condition, (e, docs) => {
                    if (e) return resolve([]);
                    return resolve(docs);
                })
            })
        })
        .then((hotels)=> {
            Util.spinner.stop();
            Util.vorpal.log(`Found ${Util.printValue(hotels.length)} hotels with 0 images or suites with 0 images...`);
            return this.SelectHotel(hotels);
        });
    }

    private SelectHotel(hotels: Array<SabreHotel>): Promise<TerminalFlow<SabreHotel>> {
        Util.spinner.stop();
        Util.vorpal.log(`${Util.printWarning()} Multiple hotel found with current mongo search logic:`);
        hotels = _.sortBy(hotels, ["name", "sabreName"], ["asc", "asc"]);
        let choices: Array<any> = new Array<any>();
        choices.push(new InquirerSelectHotelAnswer("Return to previous screen", -1));
        choices.push(new Util.inquirer.Separator());
        choices = _.concat(choices, _.map(hotels, (hotel) => {
            return new InquirerSelectHotelAnswer("", hotel, true, true);
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
    }
}