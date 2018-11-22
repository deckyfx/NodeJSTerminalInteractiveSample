
import Util from "../Util";
import DataManager from "../repositories/DataManager";
import ActionBase from "./ActionBase";
import PortCity from "../models/PortCity";

export default class SearchLocation extends ActionBase {

    static buildAutoComplete(input: any, next: Function): void {
        try {
            (new SearchLocation(next, input)).autoComplete();
        } catch (e) {
            Util.vorpal.log('Something wrong happened!');
            console.error(e);
        }
    }

    static build(args: any, next: Function): void {
        try {
            (new SearchLocation(next, args)).run();
        } catch (e) {
            Util.vorpal.log('Something wrong happened!');
            console.error(e);
        }
    }

    public constructor(public next: Function, public args?: any) {
        super(next, args);
    }

    protected run(): number {
        DataManager.SearchLocation(this.args.term, this.args)
        .then((cities) => {
            let _cities: Array<string> = new Array<string>();
            cities.forEach((city: PortCity) => {
                _cities.push(`${(city.name!)}, ${(city.city)} - ${city.country} (${city.iata})`);
            });
            Util.vorpal.log(_cities.join("\n"));
            this.next();
        }).catch((e) => {
            console.log(e);
            this.next();
        });
        return 0;
    }

    private autoComplete(): number {
        DataManager.SearchLocation(this.args, {})
        .then((cities) => {
            let _cities: Array<string> = new Array<string>();
            cities.forEach((city: PortCity) => {
                _cities.push(`${(city.name!)}, ${(city.city)} - ${city.country} (${city.iata})`);
            });
            this.next([]);
        }).catch((e) => {
            console.log(e);
            this.next([]);
        });
        return 0;
    }
}