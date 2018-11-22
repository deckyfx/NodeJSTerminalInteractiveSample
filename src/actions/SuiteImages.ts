import Util from "../Util";
import ActionBase from "./ActionBase";
import Papa = require("papaparse");
import * as fs from "fs";
import mongo, { MongoDB } from "../MongoDB";
import SabreHotel from "../models/SabreHotel";
import SabreSuite from "../models/SabreSuite";
import _ = require("lodash");
import SabreImage from "../models/SabreImage";

type SuitesMap = { [key:string]: Array<string> };
type InnerSourceMap = { sabreID: string, suites: SuitesMap };
type SourceMap = { [key:string] : InnerSourceMap }

export default class SuiteImages extends ActionBase {
    static buildAutoComplete: any;
    private tasksSize: number = 0;
    private tasksProgress: number = 1;

    static build(args: any, next: Function): void {
        try {
            (new SuiteImages(next, args)).run();
        } catch (e) {
            Util.vorpal.log('Something wrong happened!');
            console.error(e);
        }
    }

    public constructor(public next: Function, public args?: any) {
        super(next, args);
    }

    protected run(): number {        
        new Promise<Array<HotelSuite>>( (resolve, reject) => {
            // Parse local CSV file
            Papa.parse(fs.readFileSync(this.args.path).toString(), {
                complete: (results) => {
                    resolve(results.data as Array<HotelSuite>);
                },
                header: true
            });
        })
        .then( (sources) => { 
            Util.vorpal.log(`Mapping csv input...`);
            let mapped_sources: SourceMap = {};
            _.forEach(sources, (source) => {
                if (!source.sabreid_hotels || !source.sabreid_suites) {
                    return;
                }
                let hotel_source = mapped_sources[source.sabreid_hotels];
                if (!hotel_source) {
                    hotel_source = {
                        sabreID: source.sabreid_hotels,
                        suites: {}
                    };
                }
                let suite_source = hotel_source.suites[source.sabreid_suites];
                if (!suite_source) {
                    suite_source = [];
                }
                _.forOwn(source, (v, k) => { 
                    switch (k) {
                        case "sabreid_hotels": {
                        } break;
                        case "sabreid_hotels": {
                        } break;
                        default: {
                            if (v !== source.sabreid_suites && v !== source.sabreid_hotels) {
                                suite_source.push(v);
                            }
                        } break;
                    }
                });
                hotel_source.suites[source.sabreid_suites] = suite_source;
                mapped_sources[source.sabreid_hotels] = hotel_source;
            });
            let remaped_sources: Array<InnerSourceMap> = [];            
            _.forOwn(mapped_sources, (v, k) => {
                remaped_sources.push(v);
            });
            remaped_sources = _.filter(remaped_sources, (maped_sources) => {
                if (!maped_sources.sabreID || _.size(maped_sources.suites) == 0) {
                    return false;
                }
                return true;
            })
            this.tasksSize = remaped_sources.length;
            Util.vorpal.log(`CSV remaped to ${Util.printValue(this.tasksSize)} tasks`);
            return Util.SequencePromises<InnerSourceMap, boolean>(remaped_sources, this.updateSuite.bind(this));
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

    private parseImageURLs(imageurls: string[]): Array<SabreImage> {
        let suite_images = new Array<SabreImage>();
        for (let imageurl of imageurls) {
            if (imageurl && typeof(imageurl) === "string") {
                let splited = imageurl.split("?")[0].split("/");
                let imageO = new mongo.models.SabreImage!();
                imageO.filename = splited[splited.length - 1];
                imageO.url = imageurl;
                if (imageO.filename === "0" || imageO.url === "0") {
                    throw("Error");
                }
                suite_images.push(imageO);
            }
        }
        return suite_images;
    }
    
    private updateSuite(source: InnerSourceMap): Promise<boolean> {
        Util.vorpal.log(`${this.tasksProgress}/${this.tasksSize}\tFind hotel with sabreID: ${source.sabreID}`);
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
                Util.vorpal.log(`> Assign suite images for ${_.size(source.suites)} suites`);
                Util.spinner.start();
                let suites: SabreSuite[] = hotel.get("suites");
                let new_suites: SabreSuite[] = _.map(suites, (suite) => {
                    let sabreID = suite.get("sabreID");
                    if (source.suites[sabreID]) {
                        suite.set("images", this.parseImageURLs(source.suites[sabreID]));
                    }
                    return suite;
                })
                hotel.set("suites", new_suites);
                return Promise.resolve(hotel);
            }
            Util.vorpal.log(`Hotel with sabreID: ${source.sabreID} not found!`);
            return Promise.resolve(null);
        })
        .then((hotel) => {
            Util.spinner.stop();
            if (hotel) {
                Util.vorpal.log(`> Update suites image for hotel with sabreID: ${source.sabreID}`);
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
                Util.vorpal.log(`> Done`);
            } else {
                Util.vorpal.log(`> Failed`);
            }
            this.tasksProgress += 1;
            return Promise.resolve(result);
        })
    };
}

class HotelSuite {
    public sabreid_hotels: string = "";
    public sabreid_suites: string = "";
    public url1_suites: string = "";
    public url2_suites: string = "";
    public url3_suites: string = "";
    public url4_suites: string = "";
    public url5_suites: string = "";
}