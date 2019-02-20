
import Util from "../../Util";
import ActionBase from "./../ActionBase";
import SabreHotel from "../../models/SabreHotel";
import SabreSuite from "../../models/SabreSuite";
import Task from "../../models/Task";
import mongo, { MongoDB } from "../../MongoDB";

import * as fs from "fs";
import * as _ from "lodash";
import HotelLookup from "../../repositories/hotelrepository/HotelLookup";
import { JSDOM } from "jsdom";

type CommandArgument = { 
    [key:string]: any, 
    xmlfile: string, 
    jsonfile: string, 
    options?: { 
        [key:string]: any
    } 
}

export default class PriceChecker extends ActionBase {
    static build(args: CommandArgument, next: Function): void {
        try {
            (new PriceChecker(next, args)).run();
        } catch (e) {
            Util.vorpal.log('Something wrong happened!');
            console.error(e);
        }
    }

    public constructor(public next: Function, public args?: CommandArgument) {
        super(next, args);
    }

    // pricecheck /Users/admin/Downloads/hotel_sabre_1550650602793.xml /Users/admin/Downloads/hotel_json_1550650602789.json
    protected run(): number {
        this.ReadFiles()
        .then((result) => {
            Util.vorpal.log("Comparing betwen XML and JSON");
            const hotel_xml = result[0];
            const hotel_json = result[1];
            Util.vorpal.log(`Hotel name ${Util.printValue(hotel_json.get("name"))} ` +
                `in ${Util.printValue(hotel_json.get("city")._id)}, ` +
                `(${Util.printValue(hotel_json.get("sabreID"))})`);
            Util.vorpal.log(`--------Suites---------`);
            _.forEach(hotel_json.get('suites') as Array<SabreSuite>, (suite) => {
                // first find this suite in hotel_xml
                let found = _.find(hotel_xml.get("suites") as Array<SabreSuite>, (suite_b) => {
                    return suite_b.get("sabreID") == suite.get("sabreID");
                });
                if (found) {
                    Util.vorpal.log(`Suite found: ${Util.printValue(suite.get("sabreID"))}`);
                    Util.vorpal.log(`Description: ${Util.printValue(suite.get("description"))}`);
                    Util.vorpal.log(`In JSON`);
                    let tax             = suite.get("tax") as number;
                    let total_rate      = suite.get("total_rate") as number;
                    let total_rate_tax  = suite.get("total_rate_tax") as number;
                    let duration        = suite.get("duration") as number;
                    let verdict         = (total_rate_tax - total_rate) == tax;
                    Util.vorpal.log(`  Tax      : ${Util.printValue(tax)}`);
                    Util.vorpal.log(`  Rate     : ${Util.printValue(total_rate)}`);
                    Util.vorpal.log(`  Duration : - `);
                    Util.vorpal.log(`  Total    : ${Util.printValue(total_rate_tax)}`);
                    Util.vorpal.log(`  Verdict  : ${verdict? Util.printSuccess():Util.printWarning()}`);
                    Util.vorpal.log(`In XML`);
                    let tax2            = found.get("tax") as number;
                    let total_rate2     = found.get("total_rate") as number;
                    let total_rate_tax2 = found.get("total_rate_tax") as number;
                    let duration2       = found.get("duration") as number;
                    let verdict2        = (total_rate_tax - total_rate) == tax;
                    Util.vorpal.log(`  Tax      : ${Util.printValue(tax2)}`);
                    Util.vorpal.log(`  Rate     : ${Util.printValue(total_rate2)}`);
                    Util.vorpal.log(`  Duration : ${Util.printValue(duration2)}`);
                    Util.vorpal.log(`  Total    : ${Util.printValue(total_rate_tax2)}`);
                    Util.vorpal.log(`  Verdict  : ${verdict2? Util.printSuccess():Util.printWarning()}`);
                    Util.vorpal.log(`Verdict`);
                    let tax3            = tax == tax2;
                    let total_rate3     = total_rate == total_rate2;
                    let total_rate_tax3 = total_rate_tax == total_rate_tax2;
                    let duration3       = duration == duration2;
                    let verdict3        = verdict == verdict2
                    Util.vorpal.log(`  Tax      : ${tax3? Util.printSuccess():Util.printWarning()}`);
                    Util.vorpal.log(`  Rate     : ${total_rate3? Util.printSuccess():Util.printWarning()}`);
                    Util.vorpal.log(`  Duration : - `);
                    Util.vorpal.log(`  Total    : ${total_rate_tax3? Util.printSuccess():Util.printWarning()}`);
                    Util.vorpal.log(`  Verdict  : ${verdict3? Util.printSuccess():Util.printWarning()}`);
                    Util.vorpal.log(``);
                } else {
                    Util.vorpal.log(`Suite not found ${Util.printValue(suite.get("sabreID"))}`);
                    Util.vorpal.log(``);
                }
            });
            this.next();
        }).catch((e) => {
            console.log(e);
            this.next();
        })
        return 0;
    }

    private ReadFiles(): Promise<Array<SabreHotel>> {
        return new Promise((resolve, reject) => {
            let result: Array<SabreHotel> = [];
            try {
                let xmldata = fs.readFileSync(this.args!.xmlfile).toString();
                let task = new Task({}, null, "");
                task = task.reset();
                task.hotel = new mongo.models.SabreHotel!({}); 
                let hotel_lookup = new HotelLookup();
                let dom = new JSDOM(xmldata, {
                    contentType: "text/xml",
                });
                task = hotel_lookup.ParseHotelPropertyDescription(task, dom);
                result.push(task.hotel);
            } catch (e) {
                reject(e);
            }
            try {
                let jsondata = JSON.parse(fs.readFileSync(this.args!.jsonfile).toString());
                let hotel = new mongo.models.SabreHotel!(jsondata);
                result.push(hotel);
            } catch (e) {
                reject(e);
            }
            resolve(result);
        });
    }
}