import Util from "../Util";
import ActionBase from "./ActionBase";
import * as fs from "fs";
import mongo, { MongoDB } from "../MongoDB";
import SabreHotel from "../models/SabreHotel";
import SabreSuite from "../models/SabreSuite";
import _ = require("lodash");

export default class TaskExport extends ActionBase {
    static buildAutoComplete: any;

    static build(args: any, next: Function): void {
        try {
            (new TaskExport(next, args)).run();
        } catch (e) {
            Util.vorpal.log('Something wrong happened!');
            console.error(e);
        }
    }

    public constructor(public next: Function, public args?: any) {
        super(next, args);
    }

    protected run(): number {
        let results = new Array<String[]>();
        mongo.models.Hotel!.find({ sabreID: { $exists: true } })
        .then((hotels) => {
            _.forEach(hotels, (hotel: SabreHotel) => {
                let result = new Array<string>();
                result.push(hotel.get("sabreID"));
                result.push(hotel.get("sabreName"));
                result.push(hotel.get("city"));
            });
        })
        return 0;
    }
    
    private updateSuite(source: HotelSuite): Promise<boolean> {
        if (!source.sabreID || !source.suiteSabreID || !source.url) {
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
                Util.vorpal.log(`Find hotel suite with sabreID: ${source.suiteSabreID}`);
                Util.spinner.start();
                let suites: SabreSuite[] = hotel.get("suites");
                let found = _.findIndex(suites, (suite) => {
                    return suite.get("sabreID") === source.suiteSabreID;
                });
                if (found) {
                    let splited = source.url.split("?")[0].split("/");
                    let image = new mongo.models.SabreImage!();
                    image.filename = splited[splited.length - 1];
                    image.url = source.url;
                    let suite = suites[found];
                    suite.images = [image];
                    suites[found] = suite;
                    hotel.set("suites", suites);
                    return Promise.resolve(hotel);
                }
            }
            return Promise.resolve(undefined);
        })
        .then((hotel) => {
            Util.spinner.stop();
            if (hotel) {
                Util.vorpal.log(`Update hotel suites image with sabreID: ${source.sabreID} to ${source.url}`);
                Util.spinner.start();
                return new Promise<boolean>((resolve, reject) => {
                    hotel!.update({
                        $set: { suites: hotel.get("suites") }
                    }, (e) => {
                        if (e) return resolve(false);
                        return resolve(true);
                    });            
                });
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

class HotelSuite {
    public sabreID: string = "";
    public suiteSabreID: string = "";
    public url: string = "";
}