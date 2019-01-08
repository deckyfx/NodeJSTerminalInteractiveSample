import LogManager from "./LogManager";
import { Logger } from "winston";
import * as _ from "lodash";
import * as inquirer from "inquirer";
import airports, { AirportDataExtended } from "./utils/airport_data_extended";
import hotelcaches, { HotelSearchCache } from "./utils/hotel_search_cache";
const vorpal = require('vorpal');
const clc = require('cli-color');
const CLI = require('clui');
const boxen = require('boxen');
import * as figures from "figures";
const COUNTRY = require('country-data');
const leven = require('leven');
const inquirer_cbp = require('inquirer-checkbox-plus-prompt');
const rjson = require('really-relaxed-json');
import { XmlEntities } from "html-entities";
import opn = require('opn');

inquirer.registerPrompt('checkbox-plus', inquirer_cbp);

export class Util {
    private static instance: Util;

    static getInstance() {
        if (!Util.instance) {
            Util.instance = new Util();
            // ... any one time initialization goes here ...
        }
        return Util.instance;
    }

    public Loger: Logger = LogManager;
    //public mongo: MongoDB = MongoDBInstance;
    public clc = clc;
    public CLI = CLI;
    public vorpal = vorpal();
    public spinner = new CLI.Spinner('Processing...');
    public country = COUNTRY;
    public airports: AirportDataExtended = airports;
    public inquirer = inquirer;
    public prompt = inquirer.createPromptModule();
    public hotelcaches: HotelSearchCache = hotelcaches;
    public figures = figures;
    public boxen = boxen;
    public leven = leven;
    public entities = new XmlEntities();
    public rjson = rjson;
    public opn = opn;

    public printSuccess(): string {
        return `${this.figures.arrowRight} ${this.clc.green.bold(this.figures.tick)}`;
    }
    
    public printFailure(): string {
        return `${this.figures.arrowRight} ${this.clc.red.bold(this.figures.cross)}`;
    }
    
    public printWarning(): string {
        return `${this.figures.arrowRight} ${this.clc.yellow.bold(this.figures.warning)}`;
    }
    
    public printInfo(): string {
        return `${this.figures.arrowRight} ${this.clc.blue.bold(this.figures.info)}`;
    }
    
    public printStar(): string {
        return `${this.figures.arrowRight} ${this.clc.blue.bold(this.figures.star)}`;
    }

    public printValue(value: string | number): string {
        return `${this.clc.blue(value)}`;
    }

    public compareString(str1?: string, str2?: string, ignoreCase?: boolean): number {
        if (!str1) {
            str1 = "";
        }
        if (!str2) {
            str2 = "";
        }
        let leven = this.leven(ignoreCase? str1.toLowerCase(): str1, ignoreCase? str2.toLowerCase(): str2);
        return (str1.length > 0)? (1 - (leven / str1.length)) : 0;
    }

    public SequencePromises<K, T>(promise_argument: Array<K>, task: (input: K) => Promise<T>): Promise<Array<T>> {
        let results: Array<T> = new Array<T>();
        let start_promise = promise_argument.reduce((promise: Promise<T | void>, argument) => {
            return promise.then((result) => {
                if (result) {
                    results.push(result);
                }
                return task(argument);
            });
        }, Promise.resolve()); // initial
        return new Promise<Array<T>>((resolve, reject) => {
            return start_promise.then((result) => {
                if (result) {
                    results.push(result);
                }
                resolve(results);
            }).catch((e: any) => {
                reject(e);
            });
        });
    }

    private constructor() {
    }
}

export default Util.getInstance(); // do something with the instance...