import PortCity from "./PortCity";
import SabreHotel from "./SabreHotel";
import * as Backbone from "backbone";
import * as _ from "lodash";
import * as uniqid from "uniqid";
import mongo from "../MongoDB";

export default class Task extends Backbone.Model {
    get _id(): string                { return this.get("_id"); }
    set _id(value: string)           { this.set("_id", value); }
    get city(): PortCity {
        return this.get("city")
    }
    set city(value: PortCity) {
        this.set("city", value)
    }
    get hotel(): SabreHotel {
        return this.get("hotel")
    }
    set hotel(value: SabreHotel) {
        this.set("hotel", value)
    }
    get mongoid(): string {
        return this.get("mongoid")
    }
    set mongoid(value: string) {
        this.set("mongoid", value)
    }
    get hotelterms(): Array<string> {
        return this.get("hotelterms")
    }
    set hotelterms(value: Array<string>) {
        this.set("hotelterms", value)
    }
    get cityterms(): Array<string> {
        return this.get("cityterms")
    }
    set cityterms(value: Array<string>) {
        this.set("cityterms", value)
    }
    get last_attempt(): Date {
        return this.get("last_attempt")
    }
    set last_attempt(value: Date) {
        this.set("last_attempt", value)
    }
    get success(): boolean {
        return this.get("success")
    }
    set success(value: boolean) {
        this.set("success", value)
    }
    get e(): any {
        return this.get("e")
    }
    set e(value: any) {
        this.set("e", value)
    }
    get mongoHotel(): SabreHotel | null{
        return this.get("mongoHotel")
    }
    set mongoHotel(value: SabreHotel | null) {
        this.set("mongoHotel", value)
    }
    get mongoCity(): string {
        return this.get("mongoCity")
    }
    set mongoCity(value: string) {
        this.set("mongoCity", value)
    }
    get sabreID(): string {
        return this.get("sabreID")
    }
    set sabreID(value: string) {
        this.set("sabreID", value)
    }
    get forceMode(): boolean {
        return this.get("forceMode")
    }
    set forceMode(value: boolean) {
        this.set("forceMode", value)
    }
    get searchcache(): Array<any> {
        return this.get("searchcache")
    }
    set searchcache(value: Array<any>) {
        this.set("searchcache", value)
    }

    public constructor(attributes?: any, options?: any, _id?:string){
        super(attributes, options);
        this.hotel = new mongo.models.SabreHotel!(this.hotel);
        if (_id) {
            this.set("_id", _id);
        }
    }

    public initialize() {
    }

    public defaults(): any {
        return {
            _id: uniqid(),
            city: null,
            hotel: null,
            mongoid: "",
            hotelterms: new Array<string>(),
            cityterms: new Array<string>(),
            last_attempt: new Date(),
            success: false,
            SabreHotel: null,
            mongoCity: "",
            sabreID: "",
            forceMode: false,
            e: null,
            searchcache: new Array<any>(),
        };
    }

    public reset(): Task {
        this.set("city", null);
        this.set("hotel", null);
        this.set("mongoid", "");
        this.set("SabreHotel", null);
        this.set("mongoCity", "");
        this.set("sabreID", "");
        this.set("searchcache", []);
        this.set("e", null);
        this.set("success", false);
        this.set("hotelterms", this.get("hotelterms").splice(0, 1));
        this.set("cityterms", this.get("cityterms").splice(0, 1));
        return this;
    }

    public addHotelTerms(term: string): void {        
        if (!_.includes(this.hotelterms, term)) {
            this.get("hotelterms").push(term);
        }
    }

    public addCityTerms(term: string): void {
        if (!_.includes(this.cityterms, term)) {
            this.get("cityterms").push(term);
        }
    }    

    public hotelTermsEmpty(): boolean  {
        return this.get("hotelterms").length == 0;
    }

    public cityTermsEmpty(): boolean {
        return this.get("cityterms").length == 0;
    }

    public generateHotelSearchTerms(): Array<string> {
        let original_term = _.first(this.hotelterms)!;
        let terms = original_term.split(/\s|\W/g);
        let i = 0;
        terms = _.filter(terms, (val) => { return val? true:false });
        if (!_.includes(terms, original_term)) {
            terms.push(original_term)
        };
        _.forEach(terms, (term) => {
            if (term.length >= 3 ) {                
                let slice = term.slice(0, 3);
                if (!_.includes(terms, slice)) {
                    terms.push(slice);
                }
            }
        });
        if (!_.some(terms, (term) => {
            return term.toLowerCase() === "the";
        })) {
            terms.push("The");
        }
        if (!_.some(terms, (term) => {
            return term.toLowerCase() === "hotel";
        })) {
            terms.push("Hotel");
        }
        return terms;
    }

    public load(task: Task, field: string): Task {
        this.set("_id", task.get("_id"));
        this.set(field, task.get(field));
        return this;
    }

    public finalize(error: Error | null | any): Task {
        this.success = (error)? false : true;
        this.last_attempt = new Date();
        this.e = (error instanceof Error)? error.message : error;
        this.hotel.set("suites", []);
        this.hotel.set("images", []);
        this.set("searchcache", []);
        return this;
    }
}