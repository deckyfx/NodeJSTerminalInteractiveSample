import Task from "../../models/Task";
import Util from "../../Util";
import { InquirerInputAnswer, InquirerConfirmAnswer, InquirerSelectCityAnswer } from "./InquirerAnswer";
import LocationRepository from "../LocationRepository";
import * as _ from "lodash";
import PortCity from "../../models/PortCity";

export default class CityLookup {
    public constructor() {
    }

    public LookupCity(task: Task, ask?: boolean): Promise<Task> {        
        return new Promise<Task>((resolve, reject) => {
            if (task.cityTermsEmpty() || ask) {
                resolve(this.AskCityTerm(task));
            } else {
                resolve(task);
            }
        })
        .then((task) => {
            return this.LookupCityInCache(task)
            .then((cache) => {
                if (!cache) {
                    return this.LookupCityInDatabase(task);
                } else {
                    return Promise.resolve(cache);
                }
            })
        })
    }

    private AskCityTerm(task: Task): Promise<Task> {
        return new Promise<Task>((resolve, reject) => {
            return Util.prompt<InquirerInputAnswer>({
                type: 'input',
                message: 'Input city name to search',
                name: 'value'
            }).then((answer) => {
                task.addCityTerms(answer.value!)
                resolve(task);
            });
        })
    }

    private LookupCityInCache(task: Task): Promise<Task | null> {
        let caches = Util.hotelcaches.searchTaskWithSearchTerm(task);
        if (caches) {
            if (caches.city!) {
                Util.vorpal.log(`${Util.printInfo()} Used cached city data `+
                    `"${Util.printValue(caches.city!.city)}, ${Util.printValue(caches.city!.country)} (${Util.printValue(caches.city!.iata)})"`);

                    task = task.load(caches, "city");
                return Promise.resolve(task);
            } else {
                return Promise.resolve(null);
            }
        } else {
            return Promise.resolve(null);
        }
    }

    private LookupCityInDatabase(task: Task): Promise<Task> {
        Util.vorpal.log(`Lookup city ${Util.printValue(_.last(task.cityterms)!)}`);
        return (new LocationRepository()).SearchLocation(_.last(task.cityterms)!, {})
        .then((cities) => {
            if (cities.length == 1) {
                task.city = cities[0];
                Util.vorpal.log(`${Util.printInfo()} Found city ${Util.printValue(task.city.city)} (${Util.printValue(task.city.iata)})`);
                return Promise.resolve(task);
            } else {
                let choices: Array<any> = new Array<any>();
                let message = "";                
                choices.push(new InquirerSelectCityAnswer("Refine search term", -1));
                if (cities.length > 1) {
                    Util.vorpal.log(`${Util.printWarning()} Multiple cities found with search term: "${Util.printValue(_.last(task.cityterms)!)}"`);
                    choices.push(new Util.inquirer.Separator());
                    cities = _.sortBy(cities, ["name", "country"], ["asc", "asc"]);
                    choices = _.concat(choices, _.map(cities, (city) => {
                        return new InquirerSelectCityAnswer("", city);
                    }));
                    message = "Select city you want to use";
                } else {
                    Util.vorpal.log(`${Util.printFailure()} No matchup city with term "${Util.printValue(_.last(task.cityterms)!)}"`);
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
                                return this.AskCityTerm(task)
                                .then((task) => {
                                    return this.LookupCityInDatabase(task)
                                })
                            } break;
                            default: {
                                return Promise.reject(new Error('Process canceled'));
                            } break;
                        }
                    } else {
                        let city = val as PortCity;
                        Util.vorpal.log(`Use city ${Util.printValue(city.city)} (${Util.printValue(city.iata)})`);
                        task.city = city;
                        return Promise.resolve(task);
                    }                    
                });
            }
        })
    }
}