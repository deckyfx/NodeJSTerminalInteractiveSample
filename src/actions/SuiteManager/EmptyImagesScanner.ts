import mongo, { MongoDB } from "../../MongoDB";
import Util from "../../Util";
import SabreHotel from "../../models/SabreHotel";
import TerminalFlow from "./TerminalFlow";
import FlowDirection from "./FlowDirection";

export default class EmptyImagesScanner {
    public resolvedHotel: SabreHotel[] = [];;

    public Resolve(): Promise<TerminalFlow<any>> {
        return this.SearchHoels();
    }

    private SearchHoels() {
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
            this.resolvedHotel = hotels;
            return Promise.resolve(new TerminalFlow<any>(FlowDirection.NEXT));
        });
    }
}