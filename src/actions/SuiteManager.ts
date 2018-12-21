import Util from "../Util";
import ActionBase from "./ActionBase";
import _ = require("lodash");
import SelectCity from "./SuiteManager/Manual/Manual";
import ManagerMain from "./SuiteManager/ManagerMain";

export default class SuiteManager extends ActionBase {

    static build(args: any, next: Function): void {
        try {
            (new SuiteManager(next, args)).run();
        } catch (e) {
            Util.vorpal.log('Something wrong happened!');
            console.error(e);
        }
    }

    public constructor(public next: Function, public args?: any) {
        super(next, args);
    }

    protected run(): number {
        let Manager = new ManagerMain();
        Manager.Resolve()
        .then((flow) => {
            this.next();
        }).catch((e) => {
            console.log(e);
            this.next();
        })
        return 0;
    }
}