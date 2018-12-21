import SabreCity from "../../../models/SabreCity";
import TerminalFlow from "../TerminalFlow";
import mongo, { MongoDB } from "../../../MongoDB";
import Util from "../../../Util";
import { InquirerInputAnswer, InquirerSelectCityAnswer, InquirerSelectMongoCityAnswer } from "../../../repositories/hotelrepository/InquirerAnswer";
import FlowDirection from "../FlowDirection";
import _ = require("lodash");
import LocationRepository from "../../../repositories/LocationRepository";
import PortCity from "../../../models/PortCity";

export default class SearchCity {
    public Resolve(): Promise<TerminalFlow<SabreCity>> {
        return this.AskCityTerm()
        .then((flow) => {
            switch (flow.direction) {
                case FlowDirection.NEXT: {
                    return this.LookupCityInDatabase(flow.data!);
                };
            }
            return Promise.reject("Unhandled flow");
        })
        .then((flow) => {
            switch (flow.direction) {
                case FlowDirection.NEXT: {
                    return this.LookupMongoCityOnline(flow.data!);
                };
            }
            return Promise.reject("Unhandled flow");
        })
    }

    private AskCityTerm(): Promise<TerminalFlow<string>> {
        return new Promise<TerminalFlow<string>>((resolve, reject) => {
            return Util.prompt<InquirerInputAnswer>({
                type: 'input',
                message: 'Input city name to search',
                name: 'value'
            }).then((answer) => {
                resolve(new TerminalFlow(FlowDirection.NEXT, answer.value));
            });
        })
    }

    private LookupCityInDatabase(term: string): Promise<TerminalFlow<string>> {
        if (term.length == 3) {
            term = term.toUpperCase();
        }
        Util.vorpal.log(`Lookup city ${Util.printValue(term)}`);
        return (new LocationRepository()).SearchLocation(term, {})
        .then((cities) => {
            let resolved: PortCity;
            if (cities.length == 1) {
                resolved = cities[0];
                Util.vorpal.log(`${Util.printInfo()} Found city ${Util.printValue(resolved.city)} (${Util.printValue(resolved.iata)})`);
                return Promise.resolve(new TerminalFlow<string>(FlowDirection.NEXT, resolved.iata));
            } else {
                let choices: Array<any> = new Array<any>();
                let message = "";                
                choices.push(new InquirerSelectCityAnswer("Refine search term", -1));
                if (cities.length > 1) {
                    Util.vorpal.log(`${Util.printWarning()} Multiple cities found with search term: "${Util.printValue(term)}"`);
                    choices.push(new Util.inquirer.Separator());
                    cities = _.sortBy(cities, ["name", "country"], ["asc", "asc"]);
                    choices = _.concat(choices, _.map(cities, (city) => {
                        return new InquirerSelectCityAnswer("", city);
                    }));
                    message = "Select city you want to use";
                } else {
                    Util.vorpal.log(`${Util.printFailure()} No matchup city with term "${Util.printValue(term)}"`);
                    message = "What would you do?";
                }
                choices.push(new Util.inquirer.Separator());
                choices.push(new InquirerSelectCityAnswer("Cancel (skip this hotel)", -2));
                choices.push(new Util.inquirer.Separator());
                return Util.prompt<InquirerSelectCityAnswer>({
                    type: 'list',
                    name: 'value',
                    message: message,
                    choices: choices,
                    pageSize: 15,
                    default: (choices.length - 2)
                }).then((answer) => {
                    let val = answer.value!;
                    if ( typeof(val) === "number" ) {
                        let choice = val as number;
                        switch (choice) {
                            case -1: {
                                return this.AskCityTerm()
                                .then((flow) => {
                                    return this.LookupCityInDatabase(flow.data!)
                                })
                            } break;
                            default: {
                                return Promise.reject(new Error('Process canceled'));
                            } break;
                        }
                    } else {
                        let city = val as PortCity;
                        Util.vorpal.log(`Use city ${Util.printValue(city.city)} (${Util.printValue(city.iata)})`);
                        resolved = city;
                        return Promise.resolve(new TerminalFlow<string>(FlowDirection.NEXT, resolved.iata));
                    }                    
                });
            }
        })
    }

    private LookupMongoCityOnline(iata: string): Promise<TerminalFlow<SabreCity>> {
        Util.vorpal.log(`Search mongo City "${Util.printValue(iata!)}"`);
        return mongo.connect()
        .then((mongo: MongoDB) => {
            Util.spinner.start();
            return new Promise<SabreCity[]>((resolve, reject) => {
                let search_condition = { $or:[ { alias: { $elemMatch: { code: new RegExp(iata!, "i") } } } ] };
                mongo.models.City!.find(search_condition, (e, docs) => {
                    if (e) return resolve([]);
                    return resolve(docs);
                })
            })
        })
        .then((cities)=> {
            Util.spinner.stop();
            let resolved: SabreCity;
            if (cities.length == 1) {
                resolved = cities[0];
                Util.vorpal.log(`Get mongo city with _id "${Util.printValue(resolved.get("_id"))}"`);
                return Promise.resolve(new TerminalFlow(FlowDirection.NEXT, resolved));
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
                choices.push(new InquirerSelectMongoCityAnswer(`Re-search using another IATA`, -1));
                choices.push(new InquirerSelectMongoCityAnswer(`Re-search using "(${iata})"`, -2));
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
                                return this.LookupMongoCityOnline(iata);
                            } break;
                            default: {
                                return Util.prompt<InquirerInputAnswer>({
                                    type: 'input',
                                    message: 'Input mongo city id to search',
                                    name: 'value'
                                }).then((answer) => {
                                    return this.LookupMongoCityOnline(answer.value!);
                                });
                            } break;
                        }
                    } else {
                        resolved = val;
                        Util.vorpal.log(`Get mongo city with id "${Util.printValue(resolved.get("id"))}"`);
                        return Promise.resolve(new TerminalFlow(FlowDirection.NEXT, resolved));
                    } 
                });
            }
        })
    }
}