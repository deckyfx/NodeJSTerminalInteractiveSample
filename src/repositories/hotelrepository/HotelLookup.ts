import Task from "../../models/Task";
import Util from "../../Util";
import { InquirerInputAnswer, InquirerSelectHotelAnswer, InquirerConfirmAnswer } from "./InquirerAnswer";
import CityLookup from "./CityLookup";
import * as _ from "lodash";
import SabreHotel from "../../models/SabreHotel";
import SessionRepository from "../SessionRepository";
import { JSDOM } from "jsdom";
import mongo, { MongoDB } from "../../MongoDB";
import SabreImage from "../../models/SabreImage";
import moment = require("moment");
import SabreSuite from "../../models/SabreSuite";

export default class HotelLookup {
    public constructor() {
    }

    public LookupHotel(task: Task, ask?: boolean): Promise<Task> {   
        return new Promise<Task>((resolve, reject) => {
            if (task.isTaskFromMonggo()) {
                resolve(task);
            } else {
                Promise.resolve()
                .then(() => {
                    if (task.hotelTermsEmpty() || ask) {
                        return Promise.resolve(this.AskHotelTerm(task));
                    } else {
                        return Promise.resolve(task);
                    }
                })
                .then((task) => {
                    return this.LookupHotelInCache(task)
                    .then((cache) => {
                        if (!cache) {
                            return this.LookupHotelOnline(task)
                        } else {
                            return Promise.resolve(cache)
                        }
                    });
                })
                .then((task) => {
                    resolve(task);
                })
                .catch((e) => {
                    reject(e);
                })
            }
        })
        .then((task) => {
            return this.GetHotelDetail(task);
        })
        .then((task) => {
            return this.GetHotelPropertyDescription(task);
        })
    }

    private AskHotelTerm(task: Task): Promise<Task> {
        return new Promise<Task>((resolve, reject) => {
            return Util.prompt<InquirerInputAnswer>({
                type: 'input',
                message: 'Input hotel name to search',
                name: 'value'
            }).then((answer) => {
                task.addHotelTerms(answer.value!);
                resolve(task);
            });
        })
    }

    private LookupHotelInCache(task: Task): Promise<Task | null> {
        let caches = Util.hotelcaches.searchTaskWithSearchTerm(task);
        if (caches) {
            if (caches.hotel!) {
                if (caches.hotel!.get("sabreID")) {
                    Util.vorpal.log(`${Util.printInfo()} Used cached hotel data "${Util.printValue(caches.get('sabreID'))}"`);                
                    task = task.load(caches, "hotel");
                    return Promise.resolve(task);
                } else {
                    return Promise.resolve(null);
                }
            } else {
                return Promise.resolve(null);
            }
        } else {
            return Promise.resolve(null);
        }
    }

    private LookupHotelOnline(task: Task): Promise<Task> {              
        return this.GetHotelsInCity(task)
        .then((task) => {            
            let choices: Array<any> = new Array<any>();
            let message = "";                
            choices.push(new InquirerSelectHotelAnswer("Refine search term", -1));
            choices.push(new InquirerSelectHotelAnswer("Try to use another city", -2));
            let hotels = task.searchcache as Array<SabreHotel>;
            if (hotels.length > 0) {
                if (hotels.length == 1) {
                    Util.vorpal.log(`${Util.printWarning()} One Hotel found ${Util.printValue(_.last(task.hotelterms)!)} in ${Util.printValue(task.city!.city)} `+
                        `(${Util.printValue(task.city!.iata)}) ID: ${Util.printValue(hotels[0].get('sabreID'))}`);
                    
                    message = "What would you do?";
                } else if (hotels.length > 1) {
                    Util.vorpal.log(`${Util.printWarning()} Multiple hotels found with search term: "${_.last(task.hotelterms)}"`);                    
                    message = "Select hotel you want to use";
                }
                choices.push(new Util.inquirer.Separator());
                _.forEach(hotels, (hotel) => {
                    hotel.levenDistance = Util.compareString(hotel.sabreName!, _.first(task.hotelterms)!, true);
                });
                hotels = _.sortBy(hotels, ["sabreName"], ["asc"]);
                choices = _.concat(choices, _.map(hotels, (hotel) => {
                    return new InquirerSelectHotelAnswer("", hotel);
                }));
            } else {
                Util.vorpal.log(`${Util.printFailure()} No hotel found with name `+
                `"${Util.printValue(_.last(task.hotelterms)!)}" in ${Util.printValue(task.city!.city)} (${Util.printValue(task.city!.iata)})`);
                message = "What would you do?";
            }
            choices.push(new Util.inquirer.Separator());
            _.forEach(task.generateHotelSearchTerms(), (term, i) => {
                choices.push(new InquirerSelectHotelAnswer(`Search using term "${term}"`, i));
            })
            choices.push(new Util.inquirer.Separator());
            choices.push(new InquirerSelectHotelAnswer("Cancel (skip this hotel)", -3));
            choices.push(new Util.inquirer.Separator());
            Util.spinner.stop();
            return Util.prompt<InquirerSelectHotelAnswer>({
                type: 'list',
                name: 'value',
                message: message,
                choices: choices,
                pageSize: 15,
                default: (choices.length - 2)
            }).then((answer) => {
                let val = answer.value!;
                if ( typeof(val) === "number" ) {
                    let choice = val as number;
                    switch (choice) {
                        case -1: {
                            return this.AskHotelTerm(task)
                            .then((task) => {
                                return this.LookupHotelOnline(task)
                            })
                        } break;
                        case -2: {
                            return (new CityLookup()).LookupCity(task, true)
                            .then((task) => {
                                return this.LookupHotelOnline(task)
                            })
                        } break;
                        case -3: {
                            return Promise.reject(new Error('Hotel not found'));
                        } break;
                        default: {
                            let terms = task.generateHotelSearchTerms();
                            task.addHotelTerms(terms[choice]);
                            return this.LookupHotelOnline(task);
                        } break;
                    }
                } else {
                    let hotel = val as SabreHotel;
                    Util.vorpal.log(`Use hotel ${Util.printValue(hotel.get('sabreName'))} (${Util.printValue(hotel.get('sabreID'))})`);
                    task.hotel = hotel;
                    return Promise.resolve(task);
                }
            });
        });
    }

    private GetHotelsInCity(task: Task): Promise<Task> {
        let searchdata = ``;
        if (_.last(task.hotelterms)) {
            searchdata = `HotelName="${Util.entities.encode(Util.entities.decode(_.last(task.hotelterms)!))}"`;
        } 
        Util.vorpal.log(`Get hotels availibity in ${Util.printValue(task.city!.iata)}`);
        let start_date = moment(moment.now()).add(1, 'M').format("YYYY-MM-DD");
        let end_date = moment(moment.now()).add(1, 'M').add(1, 'd').format("YYYY-MM-DD");
        return SessionRepository.request("hotel:incity", [{
            search: "CITY_CODE",
            data: task.city!.iata,
        }, {
            search: "SEARCH_ATTRIBUTES",
            data: searchdata,
        }, {
            search: "CHECKIN_DATE",
            data: start_date,
        }, {
            search: "CHECKOOUT_DATE",
            data: end_date,
        }], task.get("rejectOnRequestFail")? false:true)
        .then((dom: JSDOM) => {
            Util.spinner.start();
            let results = this.ParseHotelAvailibility(dom);
            Util.vorpal.log(`${Util.printInfo()} Obtained in ${Util.printValue(results.length)} hotels in city`);
            task.searchcache = results;
            return Promise.resolve(task);
        })
        .catch((e) => {
            return this.handleRequestError(e)
            .then((answer) => {
                if (answer) {
                    return this.GetHotelsInCity(task);
                } else {
                    return Promise.reject(e);
                }
            });
        })
    }

    private ParseHotelAvailibility(dom: JSDOM): Array<SabreHotel> {
        const document = dom.window.document;
        let hotels = document.getElementsByTagName('BasicPropertyInfo');
        let results: Array<SabreHotel> = new Array<SabreHotel>();
        for (let hotel of hotels) {
            let result = new mongo.models.SabreHotel!();
            result.set(`sabreID`, hotel.getAttribute('HotelCode')); // sabreID
            result.set(`sabreName`, hotel.getAttribute('HotelName')); // name // but dont change it
            result.set(`loc`, [hotel.getAttribute('Longitude'), hotel.getAttribute('Latitude')]);
            let id = mongo.mongo.Types.ObjectId();
            result.set(`_id`, id);
            let addresses = hotel.getElementsByTagName('AddressLine');
            let address = "";
            for (let _address of addresses) {
                address += ` ${_address.textContent}`;
            };
            result.set(`address`, address);
            results.push(result);
        }
        return results;
    }

    private ParseHotelDetail(dom: JSDOM): Array<SabreHotel> {
        const document = dom.window.document;
        let nsregex = /\<(ns\d{1,2})\:HotelContentInfo\>/gi.exec(dom.serialize());
        if (!nsregex) {
            throw new Error("Namespace not found!");
        }
        let ns = nsregex![1];
        Util.vorpal.log(`Using name space ${Util.printValue(ns)} to parse data`);
        let hotels = document.getElementsByTagName(`${ns}:HotelContentInfo`);
        let results: Array<SabreHotel> = new Array<SabreHotel>();
        for (let hotel of hotels) {
            let result = new mongo.models.SabreHotel!();
            let id = mongo.mongo.Types.ObjectId();
            result.set(`_id`, id);
            let hotelbasic = document.getElementsByTagName(`${ns}:HotelInfo`)[0];
            result.set(`sabreID`, hotelbasic.getAttribute('HotelCode'));
            result.set(`sabreName`, hotelbasic.getAttribute('HotelName'));
            result.set(`sabreChainName`, hotelbasic.getAttribute('ChainName'));
            result.set(`logo`, hotelbasic.getAttribute('Logo'));
            result.set(`loc`, [hotelbasic.getAttribute('Longitude'), hotelbasic.getAttribute('Latitude')]);
            let address = new Array<string>();
            let address_comp = hotel.getElementsByTagName(`${ns}:AddressLine1`)[0];
            address_comp? address.push(address_comp.textContent!) : void(0);
            address_comp = hotel.getElementsByTagName(`${ns}:CityName`)[0];
            address_comp? address.push(address_comp.textContent!) : void(0);
            address_comp = hotel.getElementsByTagName(`${ns}:PostalCode`)[0];
            address_comp? address.push(address_comp.textContent!) : void(0);
            address_comp = hotel.getElementsByTagName(`${ns}:AddressLine1`)[0];
            if (address_comp) {
                let code = address_comp.getAttribute('Code')!
                let cdata = Util.country.lookup.countries({alpha2: code});
                address.push((cdata.length > 0)? cdata[0].name: '');
            }
            result.set(`address`, address.join(', '));
            let imageselements = document.getElementsByTagName(`${ns}:Image`);
            let images: Array<SabreImage> = new Array<SabreImage>();
            for (let imageelement of imageselements) {
                let image = new mongo.models.SabreImage!();
                let url = imageelement.getAttribute('Url');
                image.set(`url`, url);
                image.set(`filename`, url!.substr(url!.lastIndexOf('/') + 1));
                images.push(image);
            };
            result.set(`images`, images);
            // constant data
            result.set(`groups`, [ "st" ]);
            result.set(`code`, "ABC");
            result.set(`city`, "??");
            let hoteldescription = document.getElementsByTagName(`${ns}:HotelDescriptiveInfo`)[0];
            let hotelmedia = document.getElementsByTagName(`${ns}:HotelMediaInfo`)[0];
            results.push(result);
        }
        return results;
    }

    public ParseHotelPropertyDescription(task: Task, dom: JSDOM): Task {
        const document = dom.window.document;
        let basicinfo = document.getElementsByTagName('BasicPropertyInfo')[0];
        let roomrates = document.getElementsByTagName('RoomRate');
        let results: Array<SabreSuite> = new Array<SabreSuite>();
        const description_texts = basicinfo.querySelectorAll("VendorMessages Description Text");
        let description_text = new Array<string>();
        for (let text of description_texts) {
            let _text = text.textContent!.toLowerCase();
            description_text.push(_text!.charAt(0).toUpperCase() + _text.slice(1));
        }
        task.hotel!.set('description', description_text.join(" "));
        let hotel_tax_tag = basicinfo.querySelector("Taxes Text");
        if (hotel_tax_tag) {
            let hotel_tax = hotel_tax_tag.textContent!.match(/\d+/);
            if (hotel_tax) {
                task.hotel!.set(`taxes`, parseFloat(hotel_tax[0]));
            }
        }
        for (let roomrate of roomrates) {
            let rate = roomrate.querySelector('Rate[CurrencyCode=USD]');
            let result = new mongo.models.SabreSuite!();
            result.set("sabreID", roomrate.getAttribute('IATA_CharacteristicIdentification')!);
            result.set("IATA", roomrate.getAttribute('IATA_ProductIdentification')!);
            result.set("name", result.IATA);
            let suite_descriptions: any;
            suite_descriptions = roomrate.querySelectorAll("AdditionalInfo > Text");
            let suite_description = new Array<string>();
            for (let description of suite_descriptions) {
                let _text = description.textContent!.toLowerCase();
                suite_description.push((_text!.charAt(0).toUpperCase() + _text.slice(1)).trim());
            }
            result.set("description", suite_description.join(" "));
            let cancel_policy_tag = roomrate.querySelector("AdditionalInfo > CancelPolicy");
            let cancel_policy = new mongo.models.RateCancelPolicy!();
            if (cancel_policy_tag != null) {
                cancel_policy.set("numeric", parseInt(cancel_policy_tag!.getAttribute("Numeric")!, undefined));
                cancel_policy.set("option", cancel_policy_tag!.getAttribute("Option")!);
                cancel_policy.set("description", cancel_policy_tag!.textContent!);
                result.set("cancel_policy", cancel_policy);
            }
            let commission_tag = roomrate.querySelector("AdditionalInfo > Commission");
            let commission = new mongo.models.RateCommission!();
            if (commission_tag != null) {
                commission.set("enabled", commission_tag!.getAttribute("NonCommission") == "false");
                commission.set("description", commission_tag!.textContent!);
                result.set("commission", commission);
            }
            let dca_cancelation_tag = roomrate.querySelector("AdditionalInfo > DCA_Cancelation");
            if (dca_cancelation_tag != null) {
                result.set("dca_cancelation", dca_cancelation_tag!.textContent!);
            }
            let rate_with_tax_tag = rate!.querySelector("HotelTotalPricing");
            let rate_with_tax = new mongo.models.RateTaxes!();
            if (rate_with_tax_tag != null) {
                rate_with_tax.set("total_rate", parseFloat(rate_with_tax_tag.getAttribute("Amount")!));
                let disclaimer_tag = rate_with_tax_tag!.querySelector("Disclaimer");
                if (disclaimer_tag) rate_with_tax.set("disclaimer", disclaimer_tag.textContent!);
                let surcharges_tag = rate_with_tax_tag!.querySelector("TotalSurcharges");
                if (surcharges_tag) rate_with_tax.set("surcharges", parseFloat(surcharges_tag.getAttribute("Amount")!));
                let taxes_tag = rate_with_tax_tag!.querySelector("TotalTaxes");
                if (taxes_tag) rate_with_tax.set("taxes", parseFloat(taxes_tag.getAttribute("Amount")!));
                result.set("taxes", rate_with_tax);

                let date_range_tags = rate_with_tax_tag.querySelectorAll("RateRange");
                if (date_range_tags.length > 0) {
                    let total_price_in_date_range = 0;
                    let duration = 0;
                    for (let date_range_tag of date_range_tags) {
                        let date_range_amount       = parseFloat(date_range_tag.getAttribute("Amount")!);
                        let date_range_surcharges   = parseFloat(date_range_tag.getAttribute("Surcharges")!);
                        let date_range_taxes        = parseFloat(date_range_tag.getAttribute("Taxes")!);
                        let date_range_startdate    = `${moment().format('YYYY')}-${date_range_tag.getAttribute("EffectiveDate")}` ;
                        let date_range_enddate      = `${moment().format('YYYY')}-${date_range_tag.getAttribute("ExpireDate")}`;
                        duration                    += Math.abs(moment(date_range_startdate).diff(moment(date_range_enddate), 'days'));
                        total_price_in_date_range   += duration * date_range_amount;
                    }
                    result.set("total_rate",        total_price_in_date_range);
                    result.set("total_rate_tax",    rate_with_tax.get("total_rate"));
                    result.set("tax",               rate_with_tax.get("total_rate") - total_price_in_date_range);
                    result.set("duration",  duration);
                } else {
                    let timespan_tag = document.getElementsByTagName('TimeSpan')[0];
                    if (timespan_tag) {
                        let timespan_start_date     = timespan_tag.getAttribute("Start")!;
                        let timespan_end_date       = timespan_tag.getAttribute("End")!;
                        let duration                = Math.abs(moment(timespan_start_date).diff(moment(timespan_end_date), 'days'));
                        let total_rate              = parseFloat(rate!.getAttribute('Amount')!);
                        let total_price_in_date_range   = total_rate * duration;
                        result.set("total_rate",    total_price_in_date_range );
                        result.set("total_rate_tax", rate_with_tax.get("total_rate"));
                        result.set("tax",           rate_with_tax.get("total_rate") - total_price_in_date_range);
                        result.set("duration",      duration);
                    }
                }
            }
            result.set("rate", parseFloat(rate!.getAttribute('Amount')!));
            result.set("discounts", []);
            result.set("images", []);
            result.set("facilities", []);
            result.set("is_visible", true);
            result.set("is_available", true);
            result.set("is_deleted", false);
            if (commission.get("enabled")) {
                results.push(result);
            }
            let currenttime = moment(moment.now()).toDate();
            result.set("changes_log", []);
            result.set("created_at", currenttime);
            result.set("verified", false);
        }
        // Sort by hotel rate
        results = _.sortBy(results, ["rate"], ["asc"]);       
            
        // only get 1
        // results = results.slice(0, 1);
        task.hotel!.set('suites', results);
        
        task.hotel!.set(`city`, basicinfo.getAttribute("HotelCityCode"));

        return task;
    }

    private GetHotelDetail(task: Task): Promise<Task> {
        let sabreID = task.hotel? task.hotel!.get("sabreID") : task.get("sabreID");
        Util.vorpal.log(`Get detail for hotel with sabreID: ${Util.printValue(sabreID)}`);
        return SessionRepository.request("hotel:content", [{
            search: "HOTEL_CODES",
            data: `<HotelRef HotelCode="${sabreID}" />`,
        }, {
            search: "IMAGE_SIZE",
            data: "ORIGINAL" // THUMBNAIL, SMALL, MEDIUM, LARGE 
        }], task.get("rejectOnRequestFail")? false:true)
        .then((dom: JSDOM) => {
            let results = this.ParseHotelDetail(dom);
            // step 2 search in SabreHotels the matching name, then if found, upadte it with sabre data
            // otherwise create new sabrehotels data
            if (results.length == 0) {
                Util.vorpal.log(`${Util.printFailure()} No hotel details found`);                
                return Promise.reject(`No hotel details found`);
            } else {
                Util.vorpal.log(`${Util.printSuccess()} Obtained detail for ${Util.printValue(results.length)} hotels`);
                task.hotel = results[0];
                task.set("sabreID", task.hotel!.get("sabreID"));
                return Promise.resolve(task);
            }
        })
        .catch((e) => {
            return this.handleRequestError(e)
            .then((answer) => {
                if (answer) {
                    return this.GetHotelDetail(task);
                } else {
                    return Promise.reject(e);
                }
            });
        });
    }

    private GetHotelPropertyDescription(task: Task): Promise<Task> {
        let sabreID = task.hotel? task.hotel!.get("sabreID") : task.get("sabreID")
        Util.vorpal.log(`Get hotel property description for ${Util.printValue(sabreID)}`);
        let start_date = moment(moment.now()).add(1, 'M').format("YYYY-MM-DD");
        let end_date = moment(moment.now()).add(1, 'M').add(1, 'd').format("YYYY-MM-DD");
        return SessionRepository.request("hotel:description", [{
            search: "HOTEL_CODE",
            data: sabreID,
        }, {
            search: "CHECKIN_DATE",
            data: start_date,
        }, {
            search: "CHECKOOUT_DATE",
            data: end_date,
        }], task.get("rejectOnRequestFail")?  false:true)
        .then((dom: JSDOM) => {
            // step 2 search in SabreHotels the matching name, then if found, update it with sabre data
            // otherwise create new sabrehotels data
            task = this.ParseHotelPropertyDescription(task, dom);
            Util.vorpal.log(`Obtained ${Util.printValue(task.hotel!.get('suites').length)} suites(s) for `+
                `${Util.printValue(task.hotel!.get('sabreName'))}`);
            return Promise.resolve(task);
        })
        .catch((e) => {
            return this.handleRequestError(e)
            .then((answer) => {
                if (answer) {
                    return this.GetHotelPropertyDescription(task);
                } else {
                    return Promise.reject(e);
                }
            });
        });
    }

    private handleRequestError(e: any): Promise<boolean>{
        if (e instanceof Error) {
            console.log(e.message);
            if (e.message === "Error: ESOCKETTIMEDOUT" || e.message === "ETIMEDOUT") {
                return Util.prompt<InquirerConfirmAnswer>({
                    type: 'confirm',
                    name: 'value',
                    message: `Request error, do you want to retry?`,
                    pageSize: 15,
                    default: true
                }).then((answer) => {
                    return Promise.resolve(answer.value!);
                })
            }
        }
        return Promise.resolve(false);
    }
}