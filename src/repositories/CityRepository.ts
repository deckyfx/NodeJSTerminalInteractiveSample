import RepositoryBase from "./RepositoryBase";
import mongo, { MongoDB } from "../MongoDB";
import SabreCity from "../models/SabreCity";
import { Document } from "mongoose";
import * as _ from "lodash";
import Util from "../Util";

export default class CityRepository extends RepositoryBase {
    public SeedSabreCities(): Promise<Array<SabreCity>> {
        return this.GetSeedCities()
        .then((cities) => {
            return this.PurgeSabreCities()
            .then((success) => {
                let _cities: Array<any> = [];
                cities.forEach((city: Document, index: number, array:Array<any>) => {
                    _cities.push(city.toObject());
                });
                return Promise.resolve(_cities);
            })
            .catch((e) => {
                return Promise.reject(e);
            });
        })
        .then((cities: Array<any>) => {
            return mongo.connect()
            .then((mongo: MongoDB) => {
                Util.vorpal.log("Bulk insert to SabreCity collection");
                return new Promise<Array<SabreCity>>((resolve, reject) => {
                    mongo.models.SabreCity!.insertMany(cities, (e, docs) => {
                        if (e) return reject(e);
                        resolve(docs);
                    });
                })
            })
        })
        .catch((e) => {
            return Promise.reject(e);
        })
    }

    public GetSeedCities(): Promise<Array<any>> {
        return mongo.connect()
        .then((mongo: MongoDB) => {
            return new Promise<Array<Document>>((resolve, reject) => {
                Util.vorpal.log("Get all documents from City collection");
                mongo.models.City!.find({ }, (e, cities) => {
                    if (e) return reject(e);
                    resolve(cities);
                });
            });
        })
        .catch((e) => {
            return Promise.reject(e);
        });
    }

    public PurgeSabreCities(): Promise<boolean> {
        return mongo.connect()
        .then((mongo: MongoDB) => {
            return new Promise<boolean>((resolve, reject) => {
                Util.vorpal.log("Purging SabreCity collection");
                mongo.models.SabreCity!.remove({}, (e) => {
                    if (e) return reject(e);
                    resolve(true);
                })
            });
        })
        .catch((e) => {
            return Promise.reject(e);
        });
    }

    public SearchSabreCity(term: string, searchEnabled: boolean, searchOne: boolean): Promise<Array<SabreCity>> {
        return mongo.connect()
        .then((mongo: MongoDB) => {
            return new Promise<Array<SabreCity>>((resolve, reject) => {
                var search_term;
                if (term.length > 0) {
                    search_term = { $or: [
                        { _id: new RegExp(`${term}`, 'i') },
                         { name: new RegExp(`${term}`, 'i') },
                            { "alias": {  
                                $elemMatch: {  
                                    code: new RegExp(`${term}`, 'i')
                                }
                            }
                        }
                    ] };
                } else {
                    search_term = {};
                }
                let condition = { $and: [ 
                    search_term,
                    { $or: [ 
                        { enabled: { $eq: searchEnabled } },
                        { enabled: { $exists: searchEnabled } } 
                    ] }
                ] };
                mongo.models.SabreCity!.find(
                    condition
                ).limit(searchOne? 1:20)
                .exec((err, docs) => {
                    if (err) return reject(err);
                    resolve(docs);
                });
            });
        })
        .catch((e) => {
            return Promise.reject(e);
        });
    }

    public ToggleCityEnable(toggle: boolean, citycodes: Array<string>): Promise<boolean> {
        return mongo.connect()
        .then((mongo: MongoDB) => {
            return new Promise<boolean>((resolve, reject) => {
                Util.vorpal.log(`Enabling city: ${citycodes.join(', ')}`);
                citycodes = _.map(citycodes, (code: string) => {
                    code = _.upperCase(code);
                    let split = code.split(' ');
                    if (split.length > 1) {
                        return split[0];
                    }
                    return code;
                });
                var code_condition = {};
                if (citycodes.indexOf('*') > -1) {
                } else {
                    code_condition = { _id: {  $in : citycodes } };
                }
                mongo.models.SabreCity!.updateMany(
                { $and: [ 
                        code_condition,
                        { $or: [ 
                            { enabled: { $eq: false } },
                            { enabled: { $exists: false } } 
                        ] }
                    ] },
                {
                    enabled: toggle
                },
                (err:any, docs: any) => {
                    if (err) return reject(err);
                    if (docs.nModified > 0) {
                        Util.vorpal.log(`Success, ${docs.nModified} cities was ${ toggle? 'enabled':'disabled' }`);
                    } else {
                        Util.vorpal.log(`No matching cities found`);
                    }
                    resolve(docs);
                });
            });
        })
        .catch((e) => {
            return Promise.reject(e);
        });
    }
}