import { Document } from "mongoose";
import * as mongoose from "mongoose";
import { SabreSuiteSchema } from "./SabreSuite";

export default interface SabreHotel extends Document {
    enabled?: boolean;
    sabreName?: string;
    sabreChainName?: string;
    levenDistance: number;
    taxes: number;
}
export class SabreHotelSchema {   
    public static SCHEMA: any = {
        _id: mongoose.SchemaTypes.ObjectId,
        enabled: Boolean,
        sabreName: String,
        sabreChainName: String,
        levenDistance: Number,
        taxes: Number,
        suites: [SabreSuiteSchema.SCHEMA]
    };    
}