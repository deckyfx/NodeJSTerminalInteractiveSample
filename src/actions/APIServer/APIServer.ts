// express-generator yo generator-express-no-stress-typescript --save-dev
import Util from "../../Util";
import ActionBase from "../ActionBase";
import Server from './server/common/server';
import routes from './server/routes';

export default class APIServer extends ActionBase {
    static buildAutoComplete: any;

    static build(args: any, next: Function): void {
        try {
            (new APIServer(next, args)).run();
        } catch (e) {
            Util.vorpal.log('Something wrong happened!');
            console.error(e);
        }
    }

    public constructor(public next: Function, public args?: any) {
        super(next, args);
    }

    protected run(): number {
        Promise.resolve(true)
        .then(() => {
            // Write your Express Server here
            new Server()
            .router(routes)
            .listen(3000);
            
        }).catch((e) => {
            console.log(e);
            this.next();
        });
        return 0;
    }
}