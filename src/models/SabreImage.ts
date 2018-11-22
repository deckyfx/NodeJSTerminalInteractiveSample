import { Document } from "mongoose";

export default interface SabreImage extends Document {
    filename?: string;
    url?: string;
}

export class SabreImageSchema {
    public static SCHEMA = {        
        filename: String,
        url: String,
    };
}