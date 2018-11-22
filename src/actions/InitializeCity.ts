import ActionBase from "./ActionBase";
import DataManager from "../repositories/DataManager";
import Util from "../Util";

export default class InitializeCity extends ActionBase {
    static build(args: any, next: Function): void {
        try {
            new InitializeCity(next, args);
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
        DataManager.SeedSabreCities()
        .then((cities) => {
            Util.vorpal.log(`Seeded ${cities.length} city to sabre_cities collection`);
            this.next();
        }).catch((e) => {
            console.log(e);
            this.next();
        });
        return 0;
    }
}