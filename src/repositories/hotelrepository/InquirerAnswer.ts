import SabreHotel from "../../models/SabreHotel";
import PortCity from "../../models/PortCity";
import SabreCity from "../../models/SabreCity";
import Util from "../../Util";
import Task from "../../models/Task";
import * as _ from "lodash";
import SabreSuite, { DescriptionChangeLog } from "../../models/SabreSuite";
import SabreImage from "../../models/SabreImage";
import moment = require("moment");

abstract class InquirerAnswerBase<T> {
    public constructor(public name?: string, public value?: T) {
    }
}

export class InquirerConfirmAnswer extends InquirerAnswerBase<boolean> {
}

export class InquirerIndexedAnswer extends InquirerAnswerBase<number> {
}

export class InquirerInputAnswer extends InquirerAnswerBase<string> {
}

export class InquirerSelectHotelAnswer extends InquirerAnswerBase<SabreHotel | number> {
    public constructor(public name?: string, public value?: SabreHotel | number, showimagecount?: boolean, showcity?: boolean, ) {
        super(name, value);
        if (typeof(value!) === "number" ) {
        } else {
            if (value) {
                let hotel = value! as SabreHotel;
                let sabreID = hotel.get('sabreID')? hotel.get('sabreID') : "sabreID not yet set"
                this.name = `${Util.figures.star} `;
                if (showcity) {
                    this.name += `[${Util.printValue(hotel.get("city"))}] `;
                }
                this.name +=    `${hotel.get('name')? hotel.get('name'):hotel.get('sabreName') } `+
                                `(${sabreID}), `;
                if (showimagecount) {
                    this.name += `has ${Util.printValue(hotel.get("images").length)} image(s)`;
                } else {
                    this.name += `leven: ${Util.printValue(hotel.levenDistance)} ${hotel.levenDistance == 1? Util.figures.heart : ''}`;
                }
            }
        }
    }
}

export class InquirerSelectCityAnswer extends InquirerAnswerBase<PortCity | number> {
    public constructor(public name?: string, public value?: PortCity | number) {
        super(name, value);
        if (typeof(value!) === "number" ) {
        } else {
            if (value) {
                let city = value! as PortCity;
                this.name = `${Util.figures.star} ${(city.name!)}, ${(city.city)} - ${city.country} (${city.iata})`;
            }
        }
    }
}

export class InquirerSelectMongoCityAnswer extends InquirerAnswerBase<SabreCity | number> {
    public constructor(public name?: string, public value?: SabreCity | number) {
        super(name, value);
        if (typeof(value!) === "number" ) {
        } else {
            if (value) {
                let city = value! as SabreCity;
                this.name = `${Util.figures.star} ${city.get("name")}, (${city._id})`;
            }
        }
    }
}

export class InquirerSelectTaskAnswer extends InquirerAnswerBase<Task | number> {
    public constructor(public name?: string, public value?: Task | number) {
        super(name, value);
        if (typeof(value!) === "number" ) {
        } else {
            if (value) {
                let task = value! as Task;
                this.name = 
                    `${task.get("success") ? Util.printSuccess() : Util.printFailure()} `+
                    `Task ID: "${Util.printValue(task.get("_id"))}", `+
                    `Hotel: "${Util.printValue(_.first(task.get("hotelterms"))! as string)}", `+
                    `City: "${Util.printValue(_.first(task.get("cityterms"))! as string)}" `+
                    (typeof(task.get("e") == "string")? `E: ${task.get("e")}`:"");
            }
        }
    }
}

export class InquirerSelectSuiteAnswer extends InquirerAnswerBase<SabreSuite | number> {
    public constructor(public name?: string, public value?: SabreSuite | number, idx?: number) {
        super(name, value);
        if (typeof(value!) === "number" ) {
        } else {
            if (value) {
                let suite = value! as SabreSuite;
                let sabreID = suite.get('sabreID')? suite.get('sabreID') : "sabreID not yet set";
                let unverified_changes = suite.get('changes_log') as Array<DescriptionChangeLog>;
                let unverified_changes_count = 0;
                for (let log of unverified_changes) {
                    if (!log.verified) {
                        unverified_changes_count += 1;
                    }
                }
                this.name = 
                    `${suite.get("is_available") ? Util.printSuccess() : Util.printFailure()} `+ 
                    `[${idx}] ${suite.get('name') } `+
                    `(${Util.printValue(sabreID)}), `+
                    `${Util.printValue(suite.get("images").length)} img(s), `+
                    `${Util.printValue(unverified_changes_count)} change(s) `;
            }
        }
    }
}

export class InquirerSelectSabreImageAnswer extends InquirerAnswerBase<SabreImage | number> {
    public constructor(public name?: string, public value?: SabreImage | number) {
        super(name, value);
        if (typeof(value!) === "number" ) {
        } else {
            if (value) {
                let image = value! as SabreImage;
                this.name = `${image.get("filename")}`;
            }
        }
    }
}

export class InquirerSelectChangeLogAnswer extends InquirerAnswerBase<DescriptionChangeLog | number> {
    public constructor(public name?: string, public value?: DescriptionChangeLog | number) {
        super(name, value);
        if (typeof(value!) === "number" ) {
        } else {
            if (value) {
                let log = value! as DescriptionChangeLog;
                this.name = `${moment(log.date).format('LLLL')} - ${log.label}`;
            }
        }
    }
}

