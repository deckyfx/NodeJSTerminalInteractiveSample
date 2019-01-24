import { Document } from "mongoose";
import * as mongoose from "mongoose";
import SabreHotel, { SabreHotelSchema } from "./SabreHotel";

export default interface UpdateHotelTaskRequest extends Document {
    sabreID: string;
    created?: Date;
    aggregated_hotel?: Array<SabreHotel>;
}

export class UpdateHotelTaskRequestSchema {   
    public static SCHEMA: any = {
        _id: mongoose.SchemaTypes.ObjectId,
        sabreID: String,
        created: Date,
        aggregated_hotel: Array,
    };    
}