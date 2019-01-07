import SabreHotel from "../../models/SabreHotel";
import SabreSuite, { DescriptionChangeLog } from "../../models/SabreSuite";
import Util from "../../Util";
import { InquirerInputAnswer, 
    InquirerSelectSabreImageAnswer, 
    InquirerSelectSuiteByItsDescriptionAnswer } from "../../repositories/hotelrepository/InquirerAnswer";
import SabreImage from "../../models/SabreImage";
import mongo, { MongoDB } from "../../MongoDB";
import _ = require("lodash");
import TerminalFlow from "./TerminalFlow";
import FlowDirection from "./FlowDirection";
import moment = require("moment");
import ChangeLogsViewer from "./ChangeLogsViewer";

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
        let commit_menu = "Commit changes";
        if (this.workingWith == WorkType.SUITE) {
            choices.push(new InquirerSelectSabreImageAnswer("Using images from another suite", 3));
            const suite: SabreSuite = this.workingItem as SabreSuite;
            let changelogs = suite.changes_log;
            if (changelogs) {
                let havechange: boolean = false;
                for (let changelog of suite.changes_log!) {
                    if (!changelog.verified) {
                        havechange = true;
                        break;
                    }
                }
                if (havechange) {
                    choices.push(new InquirerSelectSabreImageAnswer("View Changes Log", 5));
                    commit_menu = "Commit changes (will verify all changes log)"
                }
            }
        }
        choices.push(new InquirerSelectSabreImageAnswer(commit_menu, 4));
        choices.push(new Util.inquirer.Separator());
        let images = this.workingItem.get("images") as Array<SabreImage>;
        choices = _.concat(choices, _.map(images, (image) => {
            choices.push(new InquirerSelectSabreImageAnswer("", image));
        }));
        choices = _.filter(choices, (choice) => {
            return choice !== undefined;
        });
        if (images.length > 0) {
            choices.push(new Util.inquirer.Separator());
        }
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
                        return this.selectSuiteToBeCopied()
                    } break;
                    case 4: {
                        return this.commitChanges();
                    } break;
                    case 5: {
                        const suite: SabreSuite = this.workingItem as SabreSuite;
                        let ChangeLogVIEWER = new ChangeLogsViewer(suite.changes_log!);
                        return ChangeLogVIEWER.Resolve();
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
                    let new_suites: SabreSuite[] = _.map(suites, (suite) => {
                        if (this.suite!.get("sabreID") === suite.get("sabreID")) {
                            let images = suite.get("images");
                            images = _.concat(images, this.parseImageURLs(a_urls));
                            suite.set("images", images);
                        }
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
    
    private selectSuiteToBeCopied(): Promise<TerminalFlow<ActionResult>> {
        if (this.workingWith != WorkType.SUITE) {
            Util.vorpal.log(`Can only be used if working with a suite`);
            return Promise.resolve(new TerminalFlow<ActionResult>(FlowDirection.NEXT, new ActionResult()));
        }
        const selected_suite: SabreSuite = this.workingItem as SabreSuite;
        Util.vorpal.log(`Current Suite description: ${Util.printValue(selected_suite.get('description'))}`);
        Util.vorpal.log(`Displaying Suites by its description, omitting zero images`);
        let choices: Array<any> = new Array<any>();
        choices.push(new InquirerSelectSuiteByItsDescriptionAnswer("Return to previous screen", -1));
        choices.push(new Util.inquirer.Separator());
        let suites: SabreSuite[] = this.hotel.get("suites");
        let i = 0;
        suites = _.map( _.filter(suites, (suite) => {
            return suite.get('images').length > 0
        }),
        (suite) => {
            suite.set("rate", Util.compareString(selected_suite.get("description"), suite.get("description")));
            return suite;
        });
        suites = suites.sort(function(a, b) {
            return a.get("rate") < b.get("rate") ? 1 : -1;
        });

        choices = _.concat(choices, _.map( suites ,
        (suite) => {
            i++;
            return new InquirerSelectSuiteByItsDescriptionAnswer("", suite, i - 1);
        }));
        return Util.prompt<InquirerSelectSuiteByItsDescriptionAnswer>({
            type: 'list',
            message: "Select suite you want to copy from",
            name: 'value',
            choices: choices,
            pageSize: 15,
            default: (choices.length - 2)
        }).then((answer) => {
            let val = answer.value!;
            if ( typeof(val) === "number" ) {
                let choice = val as number;
                switch (choice) {
                    default: {
                        return Promise.resolve(new TerminalFlow<ActionResult>(FlowDirection.NEXT, new ActionResult()));
                    } break;
                }
            } else {
                let selected_suite = val as SabreSuite;
                let suites: SabreSuite[] = this.hotel.get("suites");
                let new_suites: SabreSuite[] = _.map(suites, (suite) => {
                    if (this.suite!.get("sabreID") === suite.get("sabreID")) {
                        suite.set("images", selected_suite.get('images'));
                        Util.vorpal.log(`Copied ${Util.printValue(selected_suite.get('images').length)} image(s)`);
                    }
                    return suite;
                });
                this.hotel.set("suites", new_suites);
                Util.vorpal.log(`Done`);
            }
            return Promise.resolve(new TerminalFlow<ActionResult>(FlowDirection.NEXT, new ActionResult()));
        });
    }

    private commitChanges(): Promise<TerminalFlow<ActionResult>> {
        Util.vorpal.log(`Saving changes`);
        Util.spinner.start();
        return new Promise<boolean>((resolve, reject) => {
            let suites: SabreSuite[] = this.hotel.get("suites");
            if (this.workingWith == WorkType.SUITE) {
                const suite: SabreSuite = this.workingItem as SabreSuite;
                for (let i = 0; i < suites.length; i++) {
                    if (suite.get("sabreID") == suites[i].get("sabreID")) {
                        let changeslog: DescriptionChangeLog[] = suites[i].get("changes_log");
                        if (changeslog) {
                            let currenttime = moment(moment.now()).toDate();
                            for (let n = 0; n < changeslog.length; n++) {
                                changeslog[n].verified = true;
                                changeslog[n].verivied_at = currenttime;
                            }
                            suites[i].set("changes_log", changeslog);
                            suites[i].set("verified", true);
                            suites[i].set("verivied_at", currenttime);
                        }
                    }
                }
            }
            this.hotel!.update({
                $set: { 
                    images: this.hotel.get("images"),
                    suites: suites
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