import ActionBase from "./ActionBase";
import DataManager from "../repositories/DataManager";
import Util from "../Util";
import mongo, { MongoDB } from "../MongoDB";
import SabreHotel from "../models/SabreHotel";
import SabreImage from "../models/SabreImage";

export default class HotelsImagesCounter extends ActionBase {
    static build(args: any, next: Function): void {
        try {
            new HotelsImagesCounter(next, args);
        } catch (e) {
            Util.vorpal.log('Something wrong happened!');
            console.error(e);
        }
    }

    public constructor(public next: Function, public args?: any) {
        super(next, args);
        this.run();
    }
    
    private hostsimages: {[key:string]:number} = {
        _total: 0,
    };

    protected run(): number {        
        this.getAllHotels()
        .then((result) => {
            this.next();
        }).catch((e) => {
            console.log(e);
            this.next();
        });
        return 0;
    }

    private getAllHotels(): Promise<boolean> {
        return mongo.connect()
        .then((mongo: MongoDB) => {
            return new Promise<Array<SabreHotel>>((resolve, reject) => {
                Util.vorpal.log("Counting all images from SabreHotel collection, (Count only hotel with sabreID)");
                Util.spinner.start();
                mongo.models.SabreHotel!.find({ sabreID: { $exists: true } }, (e, hotels) => {
                    Util.spinner.stop();
                    if (e) return reject(e);
                    Util.vorpal.log(`Obtained "${Util.printValue(hotels.length)}" hotels`);
                    resolve(hotels);
                });
            });
        })
        .then((hotels: Array<SabreHotel>) => {
            for (let hotel of hotels) {
                this.addImageCounter(hotel.get("logo"));
                let images: Array<SabreImage> = hotel.get("images");
                for (let image of images) {
                    this.addImageCounter(image.get("url"));
                }
            }
            console.log(this.hostsimages);
            return Promise.resolve(true);
        })
        .catch((e) => {
            Util.spinner.stop();
            return Promise.reject(e);
        });
    }

    private addImageCounter(url: string) {
        let _url = new URL(url);
        if (!this.hostsimages[_url.host]) {
            this.hostsimages[_url.host] = 1
        } else {
            this.hostsimages[_url.host] += 1;
        }
        this.hostsimages._total += 1;
    }
}