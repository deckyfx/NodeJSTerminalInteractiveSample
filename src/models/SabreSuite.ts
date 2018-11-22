import { Document } from "mongoose";
import * as mongoose from "mongoose";

export default interface SabreSuite extends Document {
    name?: string;
    available?: number;
    sabreID?: string;
    is_available?: boolean;
    description?: string;
    is_visible?: boolean;
    is_deleted?: boolean;
    rate?: number;
    images?: Array<any>;
    facilities?: Array<string>;
    discounts?: Array<any>;

    IATA?: string;
    cancel_policy?: SuiteCancelPolicy;
    commission?: SuiteCommission;
    dca_cancelation?: string;
}

export class SuiteCancelPolicy {
    public numeric?: number;
    public option?: string;
    public description?: string;
}

export class SuiteCommission {
    public enabled?: boolean;
    public description?: string;
} 

export class SuiteTaxes {
    public disclaimer?: string;
    public surcharges?: number;
    public taxes?: number;
    public total_rate?: number;
}

export class SabreSuiteSchema {
    public static CommissionSCHEMA = {        
        enabled: Boolean,
        description: String,
    };
    public static CancelPolicySCHEMA = {
        numeric: Number,
        option: String,
        description: String,
    };
    public static TaxesSCHEMA = {
        disclaimer: String,
        surcharges: Number,
        taxes: Number,
        total_rate: Number,
    };
    public static SCHEMA: any = {
        IATA: String,
        cancel_policy: SabreSuiteSchema.CancelPolicySCHEMA,
        commission: SabreSuiteSchema.CommissionSCHEMA,
        taxes: SabreSuiteSchema.TaxesSCHEMA,
        dca_cancelation: String,
    };    
}