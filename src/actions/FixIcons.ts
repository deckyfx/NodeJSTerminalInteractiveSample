import Util from "../Util";
import ActionBase from "./ActionBase";
import Papa = require("papaparse");
import * as fs from "fs";
import mongo from "../MongoDB";
import SabreHotel from "../models/SabreHotel";

export default class FixIcons extends ActionBase {
    static buildAutoComplete: any;

    static build(args: any, next: Function): void {
        try {
            (new FixIcons(next, args)).run();
        } catch (e) {
            Util.vorpal.log('Something wrong happened!');
            console.error(e);
        }
    }

    public constructor(public next: Function, public args?: any) {
        super(next, args);
    }

    protected run(): number {        
        new Promise<Array<HotelAndLogo>>( (resolve, reject) => {
            // Parse local CSV file
            Papa.parse(fs.readFileSync(this.args.path).toString(), {
                complete: (results) => {
                    resolve(results.data as Array<HotelAndLogo>);
                },
                header: true
            });
        })
        .then( (sources) => {
            return Util.SequencePromises<HotelAndLogo, boolean>(sources, this.updateLogo.bind(this));
        })
        .then(() => {
            Util.vorpal.log("Done!");
            this.next();
        }).catch((e) => {
            console.log(e);
            this.next();
        });
        return 0;
    }
    
    private updateLogo(source: HotelAndLogo): Promise<boolean> {
        let result = source.hotel.match(/\d+/gi) || [];
        if (!result) source.sabreID = "";
        source.sabreID = result[0];
        if (!source.sabreID || !source.logo) {
            Util.vorpal.log(`Skip!`);
            return Promise.resolve(false);
        }
        Util.vorpal.log(`Find hotel with sabreID: ${source.sabreID}`);
        Util.spinner.start();
        return new Promise<SabreHotel | null>((resolve, reject) => {
            mongo.connect()
            .then( (mongo) => {
                mongo.models.SabreHotel!.findOne({ sabreID: source.sabreID }, (e, doc: SabreHotel) => {
                    if (e) return resolve(null);
                    return resolve(doc);
                })
            })
        })
        .then((hotel) => {
            Util.spinner.stop();
            if (hotel) {
                Util.vorpal.log(`Update hotel log with sabreID: ${source.sabreID} to ${source.logo}`);
                Util.spinner.start();
                return new Promise<boolean>((resolve, reject) => {                    
                hotel!.update({
                    $set: { logo: source.logo }
                }, (e) => {
                    if (e) return resolve(false);
                    return resolve(true);
                });
                })
            }
            return Promise.resolve(false);
        })
        .then((result) => {
            Util.spinner.stop();
            if (result) {
                Util.vorpal.log(`Done`);
            } else {
                Util.vorpal.log(`Failed`);
            }
            return Promise.resolve(result);
        })
    };
}

class HotelAndLogo {
    public hotel: string = "";
    public logo: string = "";
    public sabreID: string = "";
}