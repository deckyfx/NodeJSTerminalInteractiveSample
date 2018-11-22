import Util from "../Util";
import ActionBase from "./ActionBase";
import DataManager from "../repositories/DataManager";

export default class FromCSV extends ActionBase {
    static buildAutoComplete: any;

    static build(args: any, next: Function): void {
        try {
            (new FromCSV(next, args)).run();
        } catch (e) {
            Util.vorpal.log('Something wrong happened!');
            console.error(e);
        }
    }

    public constructor(public next: Function, public args?: any) {
        super(next, args);
    }

    protected run(): number {
        DataManager.FromCSV(this.args.path, this.args)
        .then((result) => {
            this.next();
        }).catch((e) => {
            console.log(e);
            this.next();
        });
        return 0;
    }
}