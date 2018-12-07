import SabreHotel from "../../models/SabreHotel";
import SabreSuite from "../../models/SabreSuite";
import Util from "../../Util";
import { InquirerInputAnswer, InquirerSelectSabreImageAnswer } from "../../repositories/hotelrepository/InquirerAnswer";
import SabreImage from "../../models/SabreImage";
import mongo, { MongoDB } from "../../MongoDB";
import _ = require("lodash");
import TerminalFlow from "./TerminalFlow";
import FlowDirection from "./FlowDirection";
import moment = require("moment");

enum WorkType { HOTEl, SUITE };

export class ActionResult {
    public data:any;
}

export default class ImageManagerAction {
    private workingWith: WorkType       = WorkType.SUITE;
    private workingWithString: string   = "";
    private workingItem: SabreHotel | SabreSuite;

    public constructor(private hotel: SabreHotel, private suite?:SabreSuite) {
        if (this.suite) {
            this.workingWith        = WorkType.SUITE;
            this.workingWithString  = "Suite";
            this.workingItem        = suite!;
        } else {
            this.workingWith        = WorkType.HOTEl;
            this.workingWithString  = "Hotel";
            this.workingItem        = hotel;
        }
    }

    public Resolve(): Promise<TerminalFlow<ActionResult>>{
        Util.vorpal.log(`Working with: ${Util.printValue(this.workingWithString)}`);
        Util.vorpal.log(`${this.workingWithString} Description: ${Util.printValue(this.workingItem.get("description"))}`);
        Util.vorpal.log(`${this.workingWithString} Image Number: ${Util.printValue(this.workingItem.get("images").length)}`);
        let choices: Array<any> = new Array<any>();
        choices.push(new InquirerSelectSabreImageAnswer(`Return to previous screen`, 0));
        choices.push(new InquirerSelectSabreImageAnswer("Remove all images", 1));
        choices.push(new InquirerSelectSabreImageAnswer("Add images", 2));
        choices.push(new InquirerSelectSabreImageAnswer("Commit changes", 3));
        choices.push(new Util.inquirer.Separator());
        let images = this.workingItem.get("images") as Array<SabreImage>;
        choices = _.concat(choices, _.map(images, (image) => {
            choices.push(new InquirerSelectSabreImageAnswer("", image));
        }));
        choices = _.filter(choices, (choice) => {
            return choice !== undefined;
        });
        choices.push(new Util.inquirer.Separator());
        return Util.prompt<InquirerSelectSabreImageAnswer>({
            type: 'list',
            message: "Select what you want to do",
            name: 'value',
            choices: choices,
            pageSize: 15,
            default: 0
        }).then((answer) => {
            let val = answer.value!;
            if ( typeof(val) === "number" ) {
                let choice = val as number;
                switch (choice) {
                    case 1: {
                        return this.removeAllImages()
                    } break;
                    case 2: {
                        return this.addNewImage()
                    } break;
                    case 3: {
                        return this.commitChanges();
                    } break;
                    default: {
                        return Promise.resolve(new TerminalFlow<ActionResult>(FlowDirection.PREVIOUS, new ActionResult()));
                    } break;
                }
            } else {
                return Promise.resolve(new TerminalFlow<ActionResult>(FlowDirection.NEXT, new ActionResult()));
            }
        });
    }

    private removeAllImages(): Promise<TerminalFlow<ActionResult>> {
        Util.vorpal.log(`Removing All Image`);
        switch (this.workingWith) {
            case WorkType.SUITE: {
                let suites: SabreSuite[] = this.hotel.get("suites");
                let new_suites: SabreSuite[] = _.map(suites, (suite) => {
                    if (this.suite!.get("sabreID") === suite.get("sabreID")) {
                        suite.set("images", []);
                    }
                    return suite;
                })
                this.hotel.set("suites", new_suites);
            } break;

            case WorkType.HOTEl: {
                this.hotel.set("images", []);
            } break
        }
        Util.vorpal.log(`Done`);
        return Promise.resolve(new TerminalFlow<ActionResult>(FlowDirection.NEXT, new ActionResult()));
    }

    private addNewImage(): Promise<TerminalFlow<ActionResult>> {
        Util.vorpal.log(`Add new image`);
        return this.AskNewURL()
        .then((flow) => {
            let a_urls: string[] = flow.data!.split(" ");
            switch (this.workingWith) {
                case WorkType.SUITE: {
                    let suites: SabreSuite[] = this.hotel.get("suites");
                    let currenttime = moment(moment.now()).toDate();
                    let new_suites: SabreSuite[] = _.map(suites, (suite) => {
                        if (this.suite!.get("sabreID") === suite.get("sabreID")) {
                            let images = suite.get("images");
                            images = _.concat(images, this.parseImageURLs(a_urls));
                            suite.set("images", images);
                        }
                        suite.set("verivied_at", currenttime);
                        return suite;
                    })
                    this.hotel.set("suites", new_suites);
                } break;
    
                case WorkType.HOTEl: {
                    let images = this.hotel.get("images");
                    images = _.concat(images, this.parseImageURLs(a_urls));
                    this.hotel.set("images", images);
                } break
            }            
            Util.vorpal.log(`Done`);
            return Promise.resolve(new TerminalFlow<ActionResult>(FlowDirection.NEXT, new ActionResult()));
        })
    }

    private commitChanges(): Promise<TerminalFlow<ActionResult>> {
        Util.vorpal.log(`Saving changes`);
        Util.spinner.start();
        return new Promise<boolean>((resolve, reject) => {
            this.hotel!.update({
                $set: { 
                    images: this.hotel.get("images"),
                    suites: this.hotel.get("suites") 
                }
            }, (e) => {
                if (e) return resolve(false);
                return resolve(true);
            });            
        })
        .then((result) => {
            if (!result) {
                Util.vorpal.log(`Error, something happened`);
            }
            Util.spinner.stop();
            Util.vorpal.log(`Done`);           
            return Promise.resolve(new TerminalFlow<ActionResult>(FlowDirection.NEXT, new ActionResult()));
        })
    }

    private AskNewURL(): Promise<TerminalFlow<string>> {  
        return new Promise<TerminalFlow<string>>((resolve, reject) => {
            return Util.prompt<InquirerInputAnswer>({
                type: 'input',
                message: 'Input image urls, separated by spaces',
                name: 'value'
            }).then((answer) => {
                resolve(new TerminalFlow<string>(FlowDirection.NEXT, answer.value));
            });
        })
    }

    private parseImageURLs(imageurls: string[]): Array<SabreImage> {
        let suite_images = new Array<SabreImage>();
        for (let imageurl of imageurls) {
            if (imageurl && typeof(imageurl) === "string") {
                let splited = imageurl.split("?")[0].split("/");
                let imageO = new mongo.models.SabreImage!();
                imageO.filename = splited[splited.length - 1];
                imageO.url = imageurl;
                if (imageO.filename === "0" || imageO.url === "0") {
                    throw(`Error: invalid file name or url`);
                }
                suite_images.push(imageO);
            }
        }
        return suite_images;
    }
}