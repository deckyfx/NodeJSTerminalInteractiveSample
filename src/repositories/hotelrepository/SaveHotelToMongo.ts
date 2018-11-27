import Task from "../../models/Task";
import Util from "../../Util";
import MongoCityLookup from "./MongoCityLookup";
import mongo, { MongoDB } from "../../MongoDB";
import * as _ from "lodash";
import { InquirerSelectHotelAnswer, InquirerInputAnswer } from "./InquirerAnswer";
import SabreHotel from "../../models/SabreHotel";
import SabreSuite, { DescriptionChangeLog } from "../../models/SabreSuite";
import moment = require("moment");

export default class SaveHotelToMongo {
    public constructor() {
    }

    public SaveHotel(task: Task): Promise<Task> {
        return Promise.resolve(true)
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
            if (!task.mongoHotel) {
                Util.vorpal.log(`${Util.printWarning()} Hotel not found, creating new`);
                return new Promise<Task>((resolve, reject) => {
                    task.hotel!.set('name', task.hotel!.get('sabreName'));
                    task.hotel!.save((e, doc) => {
                        if (e) return reject(e);
                        task.mongoid = doc._id;
                        return resolve(task);
                    });
                });
            }
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
                let oldsuites = task.mongoHotel!.get("suites") as Array<SabreSuite>;
                let newsuites = task.hotel.get("suites") as Array<SabreSuite>;
                let d: number = 0;
                let e: number = 0;
                let r: number = 0;
                oldsuites = _.filter(oldsuites, (oldsuite) => {
                    if (oldsuite.get("sabreID")) {
                        return true;
                    } else {
                        r += 1;
                        return false;
                    }
                }) as Array<SabreSuite>;;
                oldsuites = _.map(oldsuites, (oldsuite) => {
                    let found = _.find(newsuites, (newsuite) => {
                        if (newsuite.get("sabreID") === oldsuite.get("sabreID")) {
                            return true;
                        }
                    }) as SabreSuite;
                    let currenttime = moment(moment.now()).toDate();
                    if (found) {
                        // should we overwrite old suite data with the new one?
                        // or what should we do?
                        oldsuite.set("is_available", true);
                        if (oldsuite.get("description") !== found.get("description")) {
                            // add changes_log,
                            // update updated_at
                            let changelogs: Array<DescriptionChangeLog> = oldsuite.get("changes_log");
                            let log = new mongo.models.DescriptionChangeLog!();
                            log.set("description", oldsuite.get("description"));
                            log.set("date", currenttime);
                            changelogs.push(log);
                            oldsuite.set("changes_log", changelogs);
                            oldsuite.set("description", found.get("description"));
                            oldsuite.set("verivied_at", currenttime);
                        }
                        e += 1;
                    } else {
                        oldsuite.set("is_available", false);
                        d += 1;
                    }
                    if (!oldsuite.get("created_at")) {
                        oldsuite.set("created_at", currenttime);
                    }
                    if (!oldsuite.get("verivied_at")) {
                        oldsuite.set("verivied_at", currenttime);
                    }
                    if (!oldsuite.get("updated_at")) {
                        oldsuite.set("updated_at", currenttime);
                    }
                    return oldsuite;
                });
                newsuites = _.filter(newsuites, (newsuite) => {
                    let found = _.find(oldsuites, (oldsuite) => {
                        if (oldsuite.get("sabreID") === newsuite.get("sabreID")) {
                            return true;
                        }
                    });
                    return !found;
                }) as Array<SabreSuite>;
                let update_suite = _.concat(oldsuites, newsuites);
                Util.vorpal.log(`${Util.printInfo()} ${Util.printValue(e)} suite(s) enabled, ` +
                    `${Util.printValue(d)} suite(s) disabled, ` + 
                    `${Util.printValue(r)} invalid suite(s) removed, ` + 
                    `${Util.printValue(newsuites.length)} new suite(s) added`);
                update_data.suites = update_suite;
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
                mongo.models.SabreHotel!.find(searchcondition, (e, docs) => {    
                    task.searchcache = docs;
                    if (e) return resolve(task);
                    return resolve(task);
                })
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