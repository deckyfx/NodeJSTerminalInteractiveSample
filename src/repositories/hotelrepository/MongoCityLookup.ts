import Task from "../../models/Task";
import Util from "../../Util";
import mongo, { MongoDB } from "../../MongoDB";
import { InquirerSelectMongoCityAnswer, InquirerInputAnswer } from "./InquirerAnswer";
import * as _ from "lodash";
import SabreCity from "../../models/SabreCity";

export default class MongoCityLookup {
    public constructor() {
    }

    public LookupMongoCity(task: Task): Promise<Task> {
        return this.LookupMongoCityInCache(task)
        .then((cache) => {
            if (cache) {
                return this.LookupMongoCityOnline(cache);
            } else {
                return this.LookupMongoCityOnline(task);
            }
        })
    }

    private LookupMongoCityInCache(task: Task): Promise<Task | null> {
        let caches = Util.hotelcaches.searchTaskWithSearchTerm(task);
        if (caches) {
            Util.vorpal.log(`${Util.printInfo()} Used cached mongocity data "${Util.printValue(caches.mongoCity)}"`);

            task = task.load(caches, "mongoCity");
            return Promise.resolve(task);
        } else {
            return Promise.resolve(null);
        }
    }

    private LookupMongoCityOnline(task: Task): Promise<Task> {
        Util.vorpal.log(`Search mongo City "${Util.printValue(task.city.name!)}"`);
        return mongo.connect()
        .then((mongo: MongoDB) => {
            Util.spinner.start();
            return new Promise<Task>((resolve, reject) => {
                let search_condition: any;
                if (task.mongoCity) {
                    search_condition = { _id: task.mongoCity };
                } else {
                    search_condition = { $or:[{ name: new RegExp(task.city.name!, "i") }, { alias: { $elemMatch: { code: new RegExp(task.city.iata!, "i") } } } ] };
                }
                mongo.models.City!.find(search_condition, (e, docs) => {
                    task.searchcache = docs;
                    if (e) return resolve(task);
                    return resolve(task);
                })
            })
        })
        .then((task)=> {
            Util.spinner.stop();
            let cities = task.searchcache as Array<SabreCity>;
            if (cities.length == 1) {
                let mongoCity = cities[0];
                task.mongoCity = mongoCity._id;
                Util.vorpal.log(`Set mongo city field to ${Util.printValue(mongoCity._id)}`);
                task.hotel!.set("city", mongoCity._id);
                let aliases:Array<MongoCityAlias> = mongoCity.get("alias") as Array<MongoCityAlias>;
                let match = _.filter(aliases, (alias) => {
                    return alias.code!.toLowerCase() === task.city.iata.toLowerCase();
                });
                if (match.length == 0) {
                    aliases.push(new MongoCityAlias(task.city.iata));
                    mongoCity.set("alias", aliases);
                    Util.vorpal.log(`Add "${Util.printValue(task.city.name!)} (${Util.printValue(task.city.iata)})" to mongo city aliases`);
                    Util.spinner.start();
                    return new Promise<Task>((resolve, reject) => {
                        mongoCity.update({
                            $set:  {"alias": aliases }
                        }, (e) => {
                            Util.spinner.stop();
                            if (e) return resolve(task);
                            return resolve(task);
                        });
                    })
                } else {
                    return Promise.resolve(task);
                }
            } else {
                let message = "";
                let choices: Array<any> = new Array<any>();                
                if (cities.length > 1) {
                    Util.vorpal.log(`${Util.printWarning()} Multiple mongo city found with current search logic:`);
                    message = "Select city you want to use";
                    cities = _.sortBy(cities, ["name"], ["asc"]);
                    choices = _.concat(choices, _.map(cities, (city) => {
                        return new InquirerSelectMongoCityAnswer("", city);
                    }));
                } else {
                    Util.vorpal.log(`${Util.printFailure()} Mongo city not found, please specify mongo city id!,`);
                    Util.vorpal.log(`${Util.printInfo()} You may need to create new city data in mongo cities collection`);  
                    message = "What would yo do?";
                }
                choices.push(new Util.inquirer.Separator());
                choices.push(new InquirerSelectMongoCityAnswer(`Input "city._id" manualy`, -1));
                choices.push(new InquirerSelectMongoCityAnswer(`Re-search using "${task.city.name} (${task.city.iata})"`, -2));
                choices.push(new Util.inquirer.Separator());
                return Util.prompt<InquirerSelectMongoCityAnswer>({
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
                            case -2: {
                                return this.LookupMongoCityOnline(task);
                            } break;
                            default: {
                                task.mongoCity = "";
                                return Util.prompt<InquirerInputAnswer>({
                                    type: 'input',
                                    message: 'Input mongo city id to search',
                                    name: 'value'
                                }).then((answer) => {
                                    task.mongoCity = answer.value!
                                    return this.LookupMongoCityOnline(task);
                                });
                            } break;
                        }
                    } else {
                        task.mongoCity = val._id;
                        task.hotel!.set("city", val._id)
                        Util.vorpal.log(`Set mongo city field to ${Util.printValue((answer.name)? answer.name : "????")}`);
                        return Promise.resolve(task);
                    } 
                });
            }
        })
    }
}

export class MongoCityAlias {
    public constructor(public code: string){
    }
}