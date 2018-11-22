import { Document } from "mongoose";

export default interface SabreCity extends Document {
    enabled?: boolean;
    type?: string
}

export class SabreCitySchema {
    public static SCHEMA = {
        enabled: Boolean
    };
}