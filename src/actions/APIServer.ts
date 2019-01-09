import Util from "../Util";
import ActionBase from "./ActionBase";

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


        }).catch((e) => {
            console.log(e);
            this.next();
        });
        return 0;
    }
    
    private updateLogo(source: HotelAndLogo): Promise<boolean> {
        let result = source.hotel.match(/\d+/gi) || [];
        if (!result) source.sabreID = "";
        source.sabreID = result[0];
        if (!source.sabreID || !source.logo) {
            Util.vorpal.log(`Skip!`);
            return Promise.resolve(false);
        }
        Util.vorpal.log(`Find hotel with sabreID: ${source.sabreID}`);
        Util.spinner.start();
        return new Promise<SabreHotel | null>((resolve, reject) => {
            mongo.connect()
            .then( (mongo) => {
                mongo.models.SabreHotel!.findOne({ sabreID: source.sabreID }, (e, doc: SabreHotel) => {
                    if (e) return resolve(null);
                    return resolve(doc);
                })
            })
        })
        .then((hotel) => {
            Util.spinner.stop();
            if (hotel) {
                Util.vorpal.log(`Update hotel log with sabreID: ${source.sabreID} to ${source.logo}`);
                Util.spinner.start();
                return new Promise<boolean>((resolve, reject) => {                    
                hotel!.update({
                    $set: { logo: source.logo }
                }, (e) => {
                    if (e) return resolve(false);
                    return resolve(true);
                });
                })
            }
            return Promise.resolve(false);
        })
        .then((result) => {
            Util.spinner.stop();
            if (result) {
                Util.vorpal.log(`Done`);
            } else {
                Util.vorpal.log(`Failed`);
            }
            return Promise.resolve(result);
        })
    };
}

class HotelAndLogo {
    public hotel: string = "";
    public logo: string = "";
    public sabreID: string = "";
}