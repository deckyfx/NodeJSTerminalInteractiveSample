import * as fs from "fs"
import * as path from "path"
import * as mongoose from "mongoose";
import * as _ from "lodash";
import SabreCity, { SabreCitySchema } from "./models/SabreCity";
import SabreHotel, { SabreHotelSchema } from "./models/SabreHotel";
import { Mongoose } from "mongoose";
import Util from "./Util";
import SabreImage, { SabreImageSchema } from "./models/SabreImage";
import SabreSuite, { SabreSuiteSchema } from "./models/SabreSuite";
const tunnel = require('tunnel-ssh');

export class MongoDB {
    private static SSH_TUNNEL_ENABLED: boolean          = true;
    private static SSH_TUNNEL_HOST: string              = "52.9.87.130";
    private static SSH_TUNNEL_USERNAME: string          = "ubuntu";
    private static SSH_TUNNEL_PASSWORD: string          = "";
    private static SSH_TUNNEL_USE_KEY: boolean          = true;
    private static SSH_TUNNEL_KEY: string               = path.join(".", "key", "suitetreatstag.pem");
    private static SSH_TUNNEL_PORT: number              = 22;
    private static MONGODB_HOST: string                 = "localhost";
    private static MONGODB_PORT: number                 = 27017;
    private static MONGODB_DB: string                   = "suitetreat_beta";
    private static MONGODB_USERNAME: string             = "";
    private static MONGODB_PASSWORD: string             = "";

    public static MONGODB_EXTERNAL_MODELS_DIR: string  = path.join("..", "external-models");

    public tunnel: any;
    public mongo: Mongoose = mongoose;
    public models: MongoModelCollection = new MongoModelCollection();

    private static instance: MongoDB;

    static getInstance() {
        if (!MongoDB.instance) {
            MongoDB.instance = new MongoDB();
            // ... any one time initialization goes here ...
        }
        return MongoDB.instance;
    }

    private constructor() {
        this.models = {
            Country: require(`${MongoDB.MONGODB_EXTERNAL_MODELS_DIR}/country.js`),
            City: require(`${MongoDB.MONGODB_EXTERNAL_MODELS_DIR}/city.js`),
            Hotel: require(`${MongoDB.MONGODB_EXTERNAL_MODELS_DIR}/hotel.js`)
        };

        this.models.SabreCity = this.mongo.model<SabreCity>('SabreCity', 
            new this.mongo.Schema(_.assign(this.models.City!.schema.obj, SabreCitySchema.SCHEMA)));
        
        this.models.SabreImage = this.mongo.model<SabreImage>('SabreImage', new this.mongo.Schema(SabreImageSchema.SCHEMA));
        
        this.models.RateCancelPolicy = this.mongo.model<SabreImage>('RateCancelPolicy', new this.mongo.Schema(SabreSuiteSchema.CancelPolicySCHEMA));        
        this.models.RateCommission = this.mongo.model<SabreImage>('RateCommission', new this.mongo.Schema(SabreSuiteSchema.CommissionSCHEMA));        
        this.models.RateTaxes = this.mongo.model<SabreImage>('RateTaxes', new this.mongo.Schema(SabreSuiteSchema.TaxesSCHEMA));
        
        SabreSuiteSchema.SCHEMA = _.assign(this.models.Hotel!.schema.obj.suites[0].obj, SabreSuiteSchema.SCHEMA);
        SabreSuiteSchema.SCHEMA.commission = this.models.RateCommission!.schema;
        SabreSuiteSchema.SCHEMA.cancel_policy = this.models.RateCancelPolicy!.schema;
        SabreSuiteSchema.SCHEMA.taxes = this.models.RateTaxes!.schema;    

        this.models.SabreSuite = this.mongo.model<SabreImage>('SabreSuite', new this.mongo.Schema(SabreSuiteSchema.SCHEMA));
        let oldschema = this.models.Hotel!.schema.obj;
        delete oldschema.suites;
        SabreHotelSchema.SCHEMA.suites[0] = this.models.SabreSuite!.schema.obj;
        let newschema = _.assign(this.models.Hotel!.schema.obj, SabreHotelSchema.SCHEMA);
        this.models.SabreHotel = this.mongo.model<SabreHotel>('SabreHotel', new this.mongo.Schema(newschema, { _id: false }));
        
        this.models.HotelsBak = this.mongo.model<SabreHotel>('HotelsBak', new this.mongo.Schema(newschema));
    }

    private ssh_config = {
        username: MongoDB.SSH_TUNNEL_USERNAME,
        host: MongoDB.SSH_TUNNEL_HOST,
        agent: process.env.SSH_AUTH_SOCK,
        privateKey: MongoDB.SSH_TUNNEL_USE_KEY? fs.readFileSync(MongoDB.SSH_TUNNEL_KEY):undefined,
        port: MongoDB.SSH_TUNNEL_PORT,
        dstPort: MongoDB.MONGODB_PORT,
        password: MongoDB.SSH_TUNNEL_PASSWORD
    };

    public connect(): Promise<MongoDB> {
        return new Promise<MongoDB>((resolve, reject) => {
            if (this.mongo.connection.readyState == 1) {
                // vorpal.log(`Use established mongo connection`);
                resolve(this);
            } else {
                Util.vorpal.log(`Establish mongo connection`);
                Util.spinner.start();
                if (MongoDB.SSH_TUNNEL_ENABLED) {
                    Util.vorpal.log(`Tunneling via ssh`);
                    this.tunnel = tunnel(this.ssh_config, (error: any, tunnel: any) => {
                        if(error){
                            Util.spinner.stop();
                            reject(error);
                        }
                        this.connectMongo(resolve, reject);
                    });
                    this.tunnel.on('error', (e: any) => {
                        Util.spinner.stop();
                        Util.vorpal.log(`SSH Tunnel broken`);
                        this.mongo.disconnect((e) => {
                            if (e) Util.vorpal.log('Failed to end mongo connection');
                        });
                        throw(e);
                    });
                } else {
                    this.connectMongo(resolve, reject);
                }
            }
        });
    }

    private connectMongo(resolve: any, reject: any){
        Util.vorpal.log(`Connect to mongodb`);
        this.mongo.connect(`mongodb://${MongoDB.MONGODB_HOST}:${MongoDB.MONGODB_PORT}/${MongoDB.MONGODB_DB}`, {
            useNewUrlParser: true
        });
        this.mongo.connection.on('error', () => {
            Util.spinner.stop();
            reject(new Error('DB connection error:'));
        });
        this.mongo.connection.once('open', () => {
            // we're connected!
            Util.spinner.stop();
            Util.vorpal.log(`Mongo connection established`);
            resolve(this);
        });
    }
}

class MongoModelCollection {
    public Country?: mongoose.Model<any>;
    public City?: mongoose.Model<any>;
    public Hotel?: mongoose.Model<any>;
    public SabreCity?: mongoose.Model<SabreCity>;
    public SabreHotel?: mongoose.Model<SabreHotel>;
    public SabreImage?: mongoose.Model<SabreImage>;
    public SabreSuite?: mongoose.Model<SabreSuite>;
    public RateCommission?: mongoose.Model<any>;
    public RateCancelPolicy?: mongoose.Model<any>;
    public RateTaxes?: mongoose.Model<any>;
    public HotelsBak?: mongoose.Model<SabreHotel>;
}

export default MongoDB.getInstance(); // do something with the instance...