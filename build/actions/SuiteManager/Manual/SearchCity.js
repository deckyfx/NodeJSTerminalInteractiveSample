"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TerminalFlow_1 = require("../TerminalFlow");
const MongoDB_1 = require("../../../MongoDB");
const Util_1 = require("../../../Util");
const InquirerAnswer_1 = require("../../../repositories/hotelrepository/InquirerAnswer");
const FlowDirection_1 = require("../FlowDirection");
const _ = require("lodash");
const LocationRepository_1 = require("../../../repositories/LocationRepository");
class SearchCity {
    Resolve() {
        return this.AskCityTerm()
            .then((flow) => {
            switch (flow.direction) {
                case FlowDirection_1.default.NEXT:
                    {
                        return this.LookupCityInDatabase(flow.data);
                    }
                    ;
            }
            return Promise.reject("Unhandled flow");
        })
            .then((flow) => {
            switch (flow.direction) {
                case FlowDirection_1.default.NEXT:
                    {
                        return this.LookupMongoCityOnline(flow.data);
                    }
                    ;
            }
            return Promise.reject("Unhandled flow");
        });
    }
    AskCityTerm() {
        return new Promise((resolve, reject) => {
            return Util_1.default.prompt({
                type: 'input',
                message: 'Input city name to search',
                name: 'value'
            }).then((answer) => {
                resolve(new TerminalFlow_1.default(FlowDirection_1.default.NEXT, answer.value));
            });
        });
    }
    LookupCityInDatabase(term) {
        if (term.length == 3) {
            term = term.toUpperCase();
        }
        Util_1.default.vorpal.log(`Lookup city ${Util_1.default.printValue(term)}`);
        return (new LocationRepository_1.default()).SearchLocation(term, {})
            .then((cities) => {
            let resolved;
            if (cities.length == 1) {
                resolved = cities[0];
                Util_1.default.vorpal.log(`${Util_1.default.printInfo()} Found city ${Util_1.default.printValue(resolved.city)} (${Util_1.default.printValue(resolved.iata)})`);
                return Promise.resolve(new TerminalFlow_1.default(FlowDirection_1.default.NEXT, resolved.iata));
            }
            else {
                let choices = new Array();
                let message = "";
                choices.push(new InquirerAnswer_1.InquirerSelectCityAnswer("Refine search term", -1));
                if (cities.length > 1) {
                    Util_1.default.vorpal.log(`${Util_1.default.printWarning()} Multiple cities found with search term: "${Util_1.default.printValue(term)}"`);
                    choices.push(new Util_1.default.inquirer.Separator());
                    cities = _.sortBy(cities, ["name", "country"], ["asc", "asc"]);
                    choices = _.concat(choices, _.map(cities, (city) => {
                        return new InquirerAnswer_1.InquirerSelectCityAnswer("", city);
                    }));
                    message = "Select city you want to use";
                }
                else {
                    Util_1.default.vorpal.log(`${Util_1.default.printFailure()} No matchup city with term "${Util_1.default.printValue(term)}"`);
                    message = "What would you do?";
                }
                choices.push(new Util_1.default.inquirer.Separator());
                choices.push(new InquirerAnswer_1.InquirerSelectCityAnswer("Cancel (skip this hotel)", -2));
                choices.push(new Util_1.default.inquirer.Separator());
                return Util_1.default.prompt({
                    type: 'list',
                    name: 'value',
                    message: message,
                    choices: choices,
                    pageSize: 15,
                    default: (choices.length - 2)
                }).then((answer) => {
                    let val = answer.value;
                    if (typeof (val) === "number") {
                        let choice = val;
                        switch (choice) {
                            case -1:
                                {
                                    return this.AskCityTerm()
                                        .then((flow) => {
                                        return this.LookupCityInDatabase(flow.data);
                                    });
                                }
                                break;
                            default:
                                {
                                    return Promise.reject(new Error('Process canceled'));
                                }
                                break;
                        }
                    }
                    else {
                        let city = val;
                        Util_1.default.vorpal.log(`Use city ${Util_1.default.printValue(city.city)} (${Util_1.default.printValue(city.iata)})`);
                        resolved = city;
                        return Promise.resolve(new TerminalFlow_1.default(FlowDirection_1.default.NEXT, resolved.iata));
                    }
                });
            }
        });
    }
    LookupMongoCityOnline(iata) {
        Util_1.default.vorpal.log(`Search mongo City "${Util_1.default.printValue(iata)}"`);
        return MongoDB_1.default.connect()
            .then((mongo) => {
            Util_1.default.spinner.start();
            return new Promise((resolve, reject) => {
                let search_condition = { $or: [{ alias: { $elemMatch: { code: new RegExp(iata, "i") } } }] };
                mongo.models.City.find(search_condition, (e, docs) => {
                    if (e)
                        return resolve([]);
                    return resolve(docs);
                });
            });
        })
            .then((cities) => {
            Util_1.default.spinner.stop();
            let resolved;
            if (cities.length == 1) {
                resolved = cities[0];
                Util_1.default.vorpal.log(`Get mongo city with _id "${Util_1.default.printValue(resolved.get("_id"))}"`);
                return Promise.resolve(new TerminalFlow_1.default(FlowDirection_1.default.NEXT, resolved));
            }
            else {
                let message = "";
                let choices = new Array();
                if (cities.length > 1) {
                    Util_1.default.vorpal.log(`${Util_1.default.printWarning()} Multiple mongo city found with current search logic:`);
                    message = "Select city you want to use";
                    cities = _.sortBy(cities, ["name"], ["asc"]);
                    choices = _.concat(choices, _.map(cities, (city) => {
                        return new InquirerAnswer_1.InquirerSelectMongoCityAnswer("", city);
                    }));
                }
                else {
                    Util_1.default.vorpal.log(`${Util_1.default.printFailure()} Mongo city not found, please specify mongo city id!,`);
                    Util_1.default.vorpal.log(`${Util_1.default.printInfo()} You may need to create new city data in mongo cities collection`);
                    message = "What would yo do?";
                }
                choices.push(new Util_1.default.inquirer.Separator());
                choices.push(new InquirerAnswer_1.InquirerSelectMongoCityAnswer(`Re-search using another IATA`, -1));
                choices.push(new InquirerAnswer_1.InquirerSelectMongoCityAnswer(`Re-search using "(${iata})"`, -2));
                choices.push(new Util_1.default.inquirer.Separator());
                return Util_1.default.prompt({
                    type: 'list',
                    message: message,
                    name: 'value',
                    choices: choices,
                    pageSize: 15,
                    default: (choices.length - 2)
                }).then((answer) => {
                    let val = answer.value;
                    if (typeof (val) === "number") {
                        let choice = val;
                        switch (choice) {
                            case -2:
                                {
                                    return this.LookupMongoCityOnline(iata);
                                }
                                break;
                            default:
                                {
                                    return Util_1.default.prompt({
                                        type: 'input',
                                        message: 'Input mongo city id to search',
                                        name: 'value'
                                    }).then((answer) => {
                                        return this.LookupMongoCityOnline(answer.value);
                                    });
                                }
                                break;
                        }
                    }
                    else {
                        resolved = val;
                        Util_1.default.vorpal.log(`Get mongo city with id "${Util_1.default.printValue(resolved.get("id"))}"`);
                        return Promise.resolve(new TerminalFlow_1.default(FlowDirection_1.default.NEXT, resolved));
                    }
                });
            }
        });
    }
}
exports.default = SearchCity;
//# sourceMappingURL=SearchCity.js.map