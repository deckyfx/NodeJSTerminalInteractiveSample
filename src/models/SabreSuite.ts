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

    updated_at?: Date;
    created_at?: Date;
    verified?: boolean;
    verivied_at?: Date;
    changes_log?: Array<DescriptionChangeLog>;
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

export class DescriptionChangeLog {
    public date?: Date;
    public label?: string;
    public oldvalue?: string;
    public newvalue?: string;
    public write_by?: string;
    public target_object_id?: string;
    public verified?: boolean;
    public verivied_at?: Date;
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
    public static DescriptionChangeLogSchema = {
        date: Date,
        label: String,
        oldvalue: String,
        newvalue: String,
        write_by: String,
        target_object_id: String,
        verified: Boolean,
        verivied_at: Date;
    };
    public static SCHEMA: any = {
        IATA: String,
        cancel_policy: SabreSuiteSchema.CancelPolicySCHEMA,
        commission: SabreSuiteSchema.CommissionSCHEMA,
        taxes: SabreSuiteSchema.TaxesSCHEMA,
        dca_cancelation: String,

        updated_at: Date,
        created_at: Date,
        verified: Boolean,
        verivied_at: Date,
        changes_log: [DescriptionChangeLog]
    };    
}