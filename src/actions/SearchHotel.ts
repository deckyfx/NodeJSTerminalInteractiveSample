
import Util from "../Util";
import DataManager from "../repositories/DataManager";
import ActionBase from "./ActionBase";

export default class SearchHotel extends ActionBase {
    static build(args: any, next: Function): void {
        try {
            (new SearchHotel(next, args)).run();
        } catch (e) {
            Util.vorpal.log('Something wrong happened!');
            console.error(e);
        }
    }

    public constructor(public next: Function, public args?: any) {
        super(next, args);
    }

    protected run(): number {
        DataManager.SearchHotel(this.args.cityname, this.args.hotelname, this.args)
        .then((task) => {
            this.next();
        }).catch((e) => {
            console.log(e);
            this.next();
        });
        return 0;
    }
}