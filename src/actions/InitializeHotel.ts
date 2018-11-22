import ActionBase from "./ActionBase";
import DataManager from "../repositories/DataManager";
import Util from "../Util";

export default class InitializeHotel extends ActionBase {
    static build(args: any, next: Function): void {
        try {
            new InitializeHotel(next, args);
        } catch (e) {
            Util.vorpal.log('Something wrong happened!');
            console.error(e);
        }
    }

    public constructor(public next: Function, public args?: any) {
        super(next, args);
        this.run();
    }

    protected run(): number {
        DataManager.SeedSabreHotels()
        .then((hotels) => {
            Util.vorpal.log(`Seeded ${hotels.length} hotel to sabrehotels collection`);
            this.next();
        }).catch((e) => {
            console.log(e);
            this.next();
        });
        return 0;
    }
}