import SabreHotel from "../models/SabreHotel";
import SessionRepository from "./SessionRepository";
import mongo, { MongoDB } from "../MongoDB";
import { Document } from "mongoose";
import Util from "../Util";

export default class SeedHotelReoistory extends SessionRepository {
    private seedHotelSize: number = 0;
    private seedHotelProgress: number = 1;

    public SeedSabreHotels(): Promise<Array<SabreHotel>> {
        return this.GetSeedHotels()
        .then((hotels) => {
            return this.PurgeSabreHotels()
            .then((success) => {
                let _hotels: Array<SabreHotel> = [];
                hotels.forEach((hotel: Document, index: number, array:Array<any>) => {
                    let data = hotel.toObject();
                    delete data._id;
                    // Emergency patch, some hotels has data with wrong schema for tax
                    for (let i = 0; i < data.tax.length; i++) {
                        if (typeof data.tax[i] != "object") {
                            data.tax[i] = { key: "temp", value: data.tax[i] }
                        }
                    }
                    let newhotel = new mongo.models.SabreHotel!(data);
                    let id = mongo.mongo.Types.ObjectId(hotel.get("id"));
                    newhotel._id = id;
                    newhotel.set("_id", id);
                    _hotels.push(newhotel);
                });
                return Promise.resolve(_hotels);
            })
            .catch((e) => {
                return Promise.reject(e);
            });
        })
        .then((hotels: Array<SabreHotel>) => {
            return mongo.connect()
            .then((mongo: MongoDB) => {
                Util.vorpal.log("Bulk insert to SabreHotel collection");
                return new Promise<Array<SabreHotel>>((resolve, reject) => {
                    Util.SequencePromises<SabreHotel, SabreHotel>(hotels, this.SaveHotel.bind(this)).then(() => {
                        resolve(hotels);
                    }).catch((e: any) => {
                        reject(e);
                    });
                })
            })
        })
        .then((hotels: Array<SabreHotel>) => {
            Util.spinner.stop();
            return Promise.resolve(hotels)
        })
        .catch((e) => {
            Util.spinner.stop();
            return Promise.reject(e);
        })
    }

    private SaveHotel(hotel: SabreHotel): Promise<SabreHotel> {
        Util.vorpal.log(`${this.seedHotelProgress}/${this.seedHotelSize}\tCloning hotel:"${Util.printValue(hotel.get('name'))}"`);
        Util.spinner.start();
        return hotel.save()
        .then((hotel) => {
            Util.spinner.stop();
            this.seedHotelProgress += 1;
            return Promise.resolve(hotel);
        })
        .catch((e) => {
            Util.spinner.stop();
            this.seedHotelProgress += 1;
            Util.vorpal.log(` Error while saving ${hotel.get('name')}`);
            console.log(e);
            // cobntinue to next hotel
            return Promise.resolve(hotel);
        });
    }

    private GetSeedHotels(): Promise<Array<any>> {
        return mongo.connect()
        .then((mongo: MongoDB) => {
            return new Promise<Array<Document>>((resolve, reject) => {
                Util.vorpal.log("Get all documents from Hotel collection");
                Util.spinner.start();
                mongo.models.Hotel!.find({ }, (e, hotels) => {
                    Util.spinner.stop();
                    if (e) return reject(e);
                    this.seedHotelSize = hotels.length;
                    Util.vorpal.log(`Obtained "${Util.printValue(this.seedHotelSize)}" hotels`);
                    resolve(hotels);
                });
            });
        })
        .catch((e) => {
            Util.spinner.stop();
            return Promise.reject(e);
        });
    }

    private PurgeSabreHotels(): Promise<boolean> {
        return mongo.connect()
        .then((mongo: MongoDB) => {
            return new Promise<boolean>((resolve, reject) => {
                Util.vorpal.log("Purging SabreHotel collection");
                Util.spinner.start();
                mongo.models.SabreHotel!.remove({}, (e) => {
                    Util.spinner.stop();
                    if (e) return reject(e);
                    resolve(true);
                })
            });
        })
        .catch((e) => {
            Util.spinner.stop();
            return Promise.reject(e);
        });
    }
}