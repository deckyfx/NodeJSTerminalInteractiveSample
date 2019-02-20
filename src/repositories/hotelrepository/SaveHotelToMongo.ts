import Task from "../../models/Task";
import Util from "../../Util";
import mongo, { MongoDB } from "../../MongoDB";
import * as mongoose from "mongoose";
import { Document } from "mongoose";
import * as _ from "lodash";
import { InquirerSelectHotelAnswer, InquirerInputAnswer } from "./InquirerAnswer";
import SabreHotel from "../../models/SabreHotel";
import SabreSuite, { DescriptionChangeLog } from "../../models/SabreSuite";
import moment = require("moment");

export default class SaveHotelToMongo {
    public constructor() {
    }

    public SaveHotel(task: Task): Promise<Task> {
        return new Promise<Task>((resolve, reject) => {
            if (task.isTaskFromMonggo()) {
                resolve(task);
            } else {
                Promise.resolve(true)
                .then(() => {
                    return this.LookupSavedHotelInCache(task)
                    .then((cache) => {
                        if (cache) {
                            return Promise.resolve(cache)
                        } else {
                            return Promise.resolve(task)
                        }
                    })
                })
                .then((task) => {
                    resolve(task);
                })
                .catch((e) => {
                    reject(e);
                })
            }
        })

        .then((task) => {
            return this.SaveOrUpdateHotel(task);
        });
    }

    private LookupSavedHotelInCache(task: Task): Promise<Task | null> {
        let caches = Util.hotelcaches.searchTaskWithSearchTerm(task);
        if (caches) {
            if (caches.get("mongoid")) {
                Util.vorpal.log(`${Util.printInfo()} Used cached hotel data "${Util.printValue(caches.hotel!.get('sabreName'))} `+
                `(${Util.printValue(caches.hotel!.get('sabreID'))})" in "${Util.printValue(caches.city!.city)} (${Util.printValue(caches.city!.iata)})"`);
                task = task.load(caches, "mongoid");
                return Promise.resolve(task)
            } else {
                return Promise.resolve(null)
            }
        } else {
            return Promise.resolve(null)
        }
    }

    private SaveOrUpdateHotel(task: Task): Promise<Task> {
        return this.LookupMongoHotel(task)        
        .then((task) => {
            if (!task.mongoHotel || task.mongoHotel.isNew) {
                Util.vorpal.log(`${Util.printWarning()} Hotel not found, creating new`);
                return new Promise<Task>((resolve, reject) => {
                    task.hotel!.set('name', task.hotel!.get('sabreName'));
                    let savehotel: SabreHotel | Document;
                    if (MongoDB.BYPASS_SABREHOTELS) {
                        savehotel = new mongo.models.Hotel!(task.hotel.toJSON());
                        (savehotel as Document).save((e: any, doc: mongoose.Document) => {
                            if (e) reject(e);
                            task.mongoid = doc._id;
                            resolve(task);
                        });
                    } else {
                        savehotel = task.hotel!;
                        (savehotel as SabreHotel).save((e: any, doc: mongoose.Document) => {
                            if (e) reject(e);
                            task.mongoid = doc._id;
                            resolve(task);
                        });
                    }
                })
            }
            console.log(task.mongoHotel);
            console.log(task.mongoHotel.get("sabreID"), task.mongoHotel.get("sabreName"), task.mongoHotel.isNew);
            Util.vorpal.log(`${Util.printInfo()} Hotel found ${Util.printValue(task.mongoHotel.get("name"))} ` +
                `(${Util.printValue(task.mongoHotel._id)}), updating`);
                
            return new Promise<Task>((resolve, reject) => {
                let _newdata = task.hotel!.toObject();
                delete _newdata._id;
                let update_data: any = {
                    sabreID: _newdata.sabreID,
                } 

                // try to replace words name;                
                if (task.mongoHotel!.get("name") === task.mongoHotel!.get("sabreChainName")) {
                    update_data.name = task.mongoHotel!.get("sabreName").replace(/\b\w/g, (l: string) => l.toUpperCase())
                }

                // overwrite sabreID if missmatch
                if (task.mongoHotel!.get("sabreID") !== _newdata.sabreID) {
                    update_data.sabreID = _newdata.sabreID;
                }

                // Don't overwrite hotel logo unless it is empty
                if (!task.mongoHotel!.get("logo")) {
                    update_data.logic = _newdata.logo;
                }
                
                // overwrite description if missmatch
                if (task.mongoHotel!.get("description") !== _newdata.description) {
                    update_data.description = _newdata.description;
                }

                // Don't overwrite images logo unless it is empty
                if ((task.mongoHotel!.get("images") as Array<any>).length == 0) {
                    update_data.images = _newdata.images;
                }
                
                // overwrite taxes if missmatch
                if (task.mongoHotel!.get("taxes") !== _newdata.taxes) {
                    update_data.taxes = _newdata.taxes;
                }

                // Force overwrite suites;
                // update_data.suites = _newdata.suites
                // Don't overwrite hotel suites, instead merge them or switch the flag
                update_data.suites = this.MergeSuites(task.mongoHotel!.get("suites"), task.hotel.get("suites"));

                // Execute update
                task.mongoHotel!.update({
                    $set: update_data
                }, (e) => {
                    if (e) return reject(e);
                    task.mongoid = task.mongoHotel!._id;
                    return resolve(task);
                });
            });
        })
        .then((task) => {
            task.mongoHotel = null;
            return Promise.resolve(task);
        })
    }

    private MergeSuites(oldsuites: Array<SabreSuite>, newsuites: Array<SabreSuite>): Array<SabreSuite> {
        let allsuites: Array<SabreSuite> = [];

        let d: number = 0;
        let e: number = 0;
        let r: number = 0;      // removed suites
        // remove invalid suites that have no sabreID
        oldsuites = _.filter(oldsuites, (oldsuite) => {
            if (oldsuite.get("sabreID")) {
                return true;
            } else {
                r += 1;
                return false;
            }
        }) as Array<SabreSuite>;

        // for every old suite, check if it also exsist in newsuites array
        oldsuites = _.map(oldsuites, (oldsuite) => {
            let found = _.find(newsuites, (newsuite) => {
                if (newsuite.get("sabreID") === oldsuite.get("sabreID")) {
                    return true;
                }
            }) as SabreSuite;
            if (found) {
                found.set("is_available", true);
                let changelogs: Array<DescriptionChangeLog> = oldsuite.get("changes_log") || [];
                let watchpath: Array<string> = [
                    "is_available",
                    "is_deleted",
                    "is_visible",
                    "description", 
                    "IATA", 
                    "name", 
                    "rate",
                    "cancel_policy.numeric",
                    "cancel_policy.option",
                    "cancel_policy.description",
                    "commission.enabled",
                    "commission.description",
                    "taxes.total_rate",
                    "taxes.disclaimer",
                    "taxes.surcharges",
                    "taxes.taxes"
                ];
                let currenttime = moment(moment.now()).toDate();
                changelogs = _.concat(changelogs, _.filter(_.map(
                    watchpath, 
                    (keypath) => {
                        return this.CompareAndCreateSuiteChangeLog(keypath, oldsuite, found);
                    }),
                    (log: DescriptionChangeLog) => {
                        if (log) {
                            oldsuite.set("updated_at",  currenttime);
                            if (!log.verified) {
                                oldsuite.set("verified",  false);
                            }
                            return true;
                        }
                        return false;
                    }) as Array<DescriptionChangeLog>
                );                
                _.forEach(watchpath, (keypath) => {
                    let value: any;
                    if (keypath.includes(".")) {
                        let keypaths    = keypath.split(".");
                        value           = found.get(keypaths[0]).get(keypaths[1]);
                        let tempobj     = oldsuite.get(keypaths[0]);
                        tempobj.set(keypaths[1], value);
                        oldsuite.set(keypaths[0], tempobj);
                    } else {
                        value           = found.get(keypath);
                        oldsuite.set(keypath, value);
                    }
                });

                oldsuite.set("changes_log", changelogs);
                e += 1;
            } else {
                oldsuite.set("is_available", false);
                let changelogs: Array<DescriptionChangeLog> = oldsuite.get("changes_log") || [];
                let log = this.CreateSuiteChangeLog("is_available", true, false);
                if (log) {
                    let currenttime = moment(moment.now()).toDate();
                    oldsuite.set("updated_at",  currenttime);
                    if (!log.verified) {
                        oldsuite.set("verified",  false);
                    }
                    changelogs.push(log);
                }

                oldsuite.set("changes_log", changelogs);
                d += 1;
            }

            let currenttime = moment(moment.now()).toDate();
            if (!oldsuite.get("created_at")) {
                oldsuite.set("created_at", currenttime);
            }
            return oldsuite;
        });

        // remove already added new suites
        newsuites = _.filter(newsuites, (newsuite) => {
            let found = _.find(oldsuites, (oldsuite) => {
                if (oldsuite.get("sabreID") === newsuite.get("sabreID")) {
                    return true;
                }
            });
            return !found;
        }) as Array<SabreSuite>;

        // join both arrays
        allsuites = _.concat(oldsuites, newsuites);

        // final step remove unnecesary fields
        let removefields: Array<string> = [
            "tax",
            "total_rate_tax",
            "total_rate",
            "duration",
        ];
        allsuites = _.map(allsuites, (allsuite) => {
            _.forEach(removefields, (key) => {
                allsuite.set(key, undefined);
            });
            return allsuite;
        });

        Util.vorpal.log(`${Util.printInfo()} ${Util.printValue(e)} suite(s) enabled, ` +
            `${Util.printValue(d)} suite(s) disabled, ` + 
            `${Util.printValue(r)} invalid suite(s) removed, ` + 
            `${Util.printValue(newsuites.length)} new suite(s) added`);

        return allsuites;
    }

    private CompareAndCreateSuiteChangeLog(keypath: string, oldsuite: SabreSuite, newsuite: SabreSuite): DescriptionChangeLog | null {
        let log: any;
        let value1: any;
        let value2: any;
        if (keypath.includes(".")) {
            let keypaths = keypath.split(".");
            value1 = oldsuite.get(keypaths[0]).get(keypaths[1]);
            value2 = newsuite.get(keypaths[0]).get(keypaths[1]);
        } else {
            value1 = oldsuite.get(keypath);
            value2 = newsuite.get(keypath);
        }
        if (value1 !== value2) {
            log = this.CreateSuiteChangeLog(keypath, value1, value2);
        }
        return log;
    }

    private CreateSuiteChangeLog(keypath: string, value1: any, value2: any): DescriptionChangeLog {
        let currenttime = moment(moment.now()).toDate();
        let log = new mongo.models.DescriptionChangeLog!();
        log.set("date",     currenttime);
        log.set("label",    keypath);
        log.set("oldvalue", value1);
        log.set("newvalue", value2);
        log.set("write_by", "Bots");
        log.set("verified", false);
        return log;
    }

    private LookupMongoHotel(task: Task): Promise<Task> {
        Util.vorpal.log(`Search hotel ${Util.printValue(task.hotel!.get('sabreName'))} from mongodb`);
        return mongo.connect()
        .then((mongo: MongoDB) => {
            Util.spinner.start();
            return new Promise<Task>((resolve, reject) => {
                let names = task.hotel!.get('sabreName').split(/\s|\W/gi);
                let searchcondition: any = { 
                    $and: [ { 
                        name: new RegExp(`(${names.join('|')})`, "i") 
                    },  {
                        loc: {
                            $geoWithin: { 
                                $centerSphere: [ 
                                    [ task.hotel!.get('loc')[0], task.hotel!.get('loc')[1] ] , 
                                    0.5 / 3963.2 
                                ] 
                            } 
                        } 
                    }] 
                };
                if (task.mongoid) {
                    searchcondition = { _id: task.mongoid };
                }
                if (MongoDB.BYPASS_SABREHOTELS) {
                    mongo.models.Hotel!.find(searchcondition, (e, docs) => {
                        task.searchcache = docs;
                        if (e) return resolve(task);
                        return resolve(task);
                    });
                } else {
                    mongo.models.SabreHotel!.find(searchcondition, (e, docs) => {    
                        task.searchcache = docs;
                        if (e) return resolve(task);
                        return resolve(task);
                    })
                }
            })
        })
        .then((task) => {
            Util.spinner.stop();
            let message = "";
            let choices: Array<any> = new Array<any>();
            let hotels = task.searchcache as Array<SabreHotel>;
            if (hotels.length > 0) {
                _.forEach(hotels, (hotel) => {
                    hotel.levenDistance = Util.compareString(hotel.sabreName!, task.hotel.sabreName!, true);
                });
                if (hotels.length == 1) {
                    let hotel = hotels[0];
                    if (hotel.levenDistance == 1 && task.mongoid == hotel.get("_id")) {
                        Util.vorpal.log(`${Util.printInfo()} Leven distance is 100% match, automatically pick hotel: `+
                            `${Util.printValue(hotel.sabreName!)} (${Util.printValue(hotel._id)})`);
                        task.mongoHotel = hotel!;
                        return Promise.resolve(task);
                    } else {
                        Util.vorpal.log(`${Util.printWarning()} One hotel found, but we still need your confirmation:`);
                        message = "What would you do?";
                    }
                } else if (hotels.length > 1) {
                    Util.vorpal.log(`${Util.printWarning()} Multiple hotel found with current mongo search logic:`);
                    message = "Select hotel you want to update";
                }
                if (task.hotel) {
                    if (task.hotel.get("sabreID")) {
                        let found = _.find(hotels, (_find: SabreHotel) => {
                            if (_find.get("sabreID") === task.hotel.get("sabreID")) return true;
                        });
                        if (found) {
                            let found_hotel = (found as SabreHotel);
                            let option = new InquirerSelectHotelAnswer("", found_hotel);
                            Util.vorpal.log(`${Util.printInfo()} But we found hotel with match sabreID, `+
                                `resolve with "${Util.printValue(found_hotel.get('name'))}" `+
                                `(${Util.printValue(found_hotel.get('sabreID'))}), `+
                                `leven: ${Util.printValue(found_hotel.get("levenDistance"))} ${found_hotel.get("levenDistance") == 1? Util.figures.heart : ''}`);

                            
                            task.mongoid = found_hotel.get("_id");
                            task.mongoHotel = found_hotel;
                            return Promise.resolve(task);
                        }
                    }
                }
                hotels = _.sortBy(hotels, ["name", "sabreName"], ["asc", "asc"]);
                choices = _.concat(choices, _.map(hotels, (hotel) => {
                    return new InquirerSelectHotelAnswer("", hotel);
                }));
                choices.push(new Util.inquirer.Separator());
            } else {
                if (task.mongoid) {
                    Util.vorpal.log(`${Util.printFailure()} Hotel with id ${task.mongoid} not found, did the id changed?`);
                    Util.vorpal.log(`${Util.printInfo()} Will retry with normal search`);
                    task.mongoid = "";
                    return this.LookupMongoHotel(task);
                } else {
                    Util.vorpal.log(`${Util.printFailure()} No hotel found with current mongo search logic:`);
                    message = "What would you do?";
                }
            }
            choices.push(new InquirerSelectHotelAnswer("Input Hotel ID", 0));
            choices.push(new InquirerSelectHotelAnswer("Create new Hotel data", 1));
            choices.push(new Util.inquirer.Separator());
            return Util.prompt<InquirerSelectHotelAnswer>({
                type: 'list',
                message: message,
                name: 'value',
                choices: choices,
                pageSize: 15,
                default: (choices.length - 2)
            }).then((answer) => {
                let val = answer.value!;
                if ( typeof(val) === "number" ) {
                    let choice = val as number;
                    switch (choice) {
                        case 0: {
                            return new Promise<Task>((resolve, reject) => {
                                return Util.prompt<InquirerInputAnswer>({
                                    type: 'input',
                                    message: 'Input mongo hotel id to search',
                                    name: 'value'
                                }).then((answer) => {
                                    task.mongoid = answer.value!;
                                    resolve(task);
                                });
                            })
                            .then((task) => {
                                return this.LookupMongoHotel(task);
                            })
                        } break;
                        default: {
                            return Promise.resolve(task);
                        } break;
                    }
                } else {
                    Util.vorpal.log(`Update hotel ${Util.printValue(answer.name? answer.name! : "????")}`);
                    task.mongoHotel = val;
                    return Promise.resolve(task);
                }                            
            });
        })
    }
}