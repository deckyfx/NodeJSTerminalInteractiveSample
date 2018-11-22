import Util from "../Util";
import ActionBase from "./ActionBase";
import mongo from "../MongoDB";
import SabreHotel from "../models/SabreHotel";

export default class ResetIcons extends ActionBase {
    static buildAutoComplete: any;

    static build(args: any, next: Function): void {
        try {
            (new ResetIcons(next, args)).run();
        } catch (e) {
            Util.vorpal.log('Something wrong happened!');
            console.error(e);
        }
    }

    public constructor(public next: Function, public args?: any) {
        super(next, args);
    }

    protected run(): number {
        this.GetSeedHotels()
        .then((hotels) => {
            return Util.SequencePromises<SabreHotel, boolean>(hotels, this.FindAndUpdate.bind(this))
            .then((results) => {
                this.next();
            })
        })
        return 0;
    }

    private FindAndUpdate(hotel: SabreHotel): Promise<boolean> {
        return new Promise<Array<SabreHotel | null>>((resolve, reject) => {
            Util.vorpal.log(`Find hotel ${hotel.get("name")} - (${hotel.get("city")}) from sabrehotels collection`);
            Util.spinner.start();
            mongo.models.SabreHotel!.findOne({ $and: [{ name: hotel.get("name") },
             { city: hotel.get("city") }, 
             { address: hotel.get("address") }] }, (e, _hotel) => {
                Util.spinner.stop();
                if (e) return resolve([hotel, null]);
                return resolve([hotel, _hotel]);
            });
        })
        .then(([hotel, _hotel]) => {
            if (_hotel) {
                Util.spinner.start();
                Util.vorpal.log(`Save hotel ${_hotel.get("name")} - (${_hotel.get("city")}) from sabrehotels collection`);
                return new Promise<boolean>((resolve, reject) => {                    
                    _hotel.update({
                        $set: { logo: hotel!.get("logo") }
                    }, (e) => {
                        Util.spinner.stop();
                        if (e) {
                            Util.vorpal.log("Failed to update");
                            return resolve(false);
                        }
                        return resolve(true);
                    });
                });
            }
            Util.vorpal.log("Hotel not found, skip");
            return Promise.resolve(false);
        })
    }

    private GetSeedHotels(): Promise<Array<SabreHotel>> {
        return mongo.connect()
        .then((mongo) => {
            return new Promise<Array<SabreHotel>>((resolve, reject) => {
                Util.vorpal.log("Get all documents from Hotelsbak collection");
                Util.spinner.start();
                mongo.models.HotelsBak!.find({  }, (e, hotels) => {
                    Util.spinner.stop();
                    if (e) return reject(e);
                    resolve(hotels);
                });
            });
        })
    }
}