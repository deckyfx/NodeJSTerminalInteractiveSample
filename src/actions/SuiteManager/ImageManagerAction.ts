import SabreHotel from "../../models/SabreHotel";
import SabreSuite, { DescriptionChangeLog } from "../../models/SabreSuite";
import Util from "../../Util";
import { InquirerInputAnswer, 
    InquirerSelectSabreImageAnswer, 
    InquirerSelectSuiteByItsDescriptionAnswer, 
    InquirerSelectSuiteAnswer} from "../../repositories/hotelrepository/InquirerAnswer";
import SabreImage from "../../models/SabreImage";
import mongo, { MongoDB } from "../../MongoDB";
import _ = require("lodash");
import TerminalFlow from "./TerminalFlow";
import FlowDirection from "./FlowDirection";
import moment = require("moment");
import ChangeLogsViewer from "./ChangeLogsViewer";

enum WorkType { HOTEL, SUITE };

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
            this.workingWith        = WorkType.HOTEL;
            this.workingWithString  = "Hotel";
            this.workingItem        = hotel;
        }
    }

    public Resolve(): Promise<TerminalFlow<ActionResult>>{
        Util.vorpal.log(`Working with: ${Util.printValue(this.workingWithString)}`);
        Util.vorpal.log(`${this.workingWithString} Description: ${Util.printValue(this.workingItem.get("description"))}`);
        Util.vorpal.log(`${this.workingWithString} Image Number: ${Util.printValue(this.workingItem.get("images").length)}`);
        let choices: Array<any> = new Array<any>();
        choices.push(new InquirerSelectSabreImageAnswer(`[${this.workingWithString}] Return to previous screen`, 0));
        choices.push(new InquirerSelectSabreImageAnswer(`[${this.workingWithString}] Remove all images`, 1));
        choices.push(new InquirerSelectSabreImageAnswer(`[${this.workingWithString}] Add images`, 2));
        let commit_menu = `[${this.workingWithString}] Commit changes`;
        if (this.workingWith == WorkType.SUITE) {
            choices.push(new InquirerSelectSabreImageAnswer(`[${this.workingWithString}] Using images from another suite`, 3));
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
                    commit_menu = `[${this.workingWithString}] Commit changes (will verify all changes log)`;
                }
            }
        } else if (this.workingWith == WorkType.HOTEL) {
            choices.push(new InquirerSelectSabreImageAnswer(`[${this.workingWithString}] Apply images from other suites with match description to new suite`, 6));
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
                        return this.removeAllImages();
                    } break;
                    case 2: {
                        return this.addNewImage();
                    } break;
                    case 3: {
                        return this.selectSuiteToBeCopied();
                    } break;
                    case 4: {
                        return this.commitChanges();
                    } break;
                    case 5: {
                        const suite: SabreSuite = this.workingItem as SabreSuite;
                        let ChangeLogVIEWER = new ChangeLogsViewer(suite.changes_log!);
                        return ChangeLogVIEWER.Resolve();
                    } break;
                    case 6: {
                        return this.smartSuiteImageApplier();
                    } break;
                    default: {
                        return Promise.resolve(new TerminalFlow<ActionResult>(FlowDirection.PREVIOUS, new ActionResult()));
                    } break;
                }
            } else {
                let choice = val as SabreImage;
                try {
                    Util.vorpal.log(`Opening URL: ${Util.printValue(choice.get("url"))}`);
                    Util.opn(choice.get("url"));
                } catch(e) {
                    Util.vorpal.console.warn(`Failed ${e}`);
                }
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

            case WorkType.HOTEL: {
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
    
                case WorkType.HOTEL: {
                    let images = this.hotel.get("images");
                    images = _.concat(images, this.parseImageURLs(a_urls));
                    this.hotel.set("images", images);
                } break
            }            
            Util.vorpal.log(`Done`);
            return Promise.resolve(new TerminalFlow<ActionResult>(FlowDirection.NEXT, new ActionResult()));
        })
    }

    private getSuitesWithSimilarDescription(sample: SabreSuite): Array<SabreSuite> {
        let suites: SabreSuite[] = [];
        let i = 0;
        suites = _.map( _.filter(this.hotel.get("suites"), (suite) => {
            return suite.get('images').length > 0 && suite.get("sabreID") != sample.get("sabreID");
        }),
        (suite) => {
            suite.set("rate", Util.compareString(sample.get("description"), suite.get("description")));
            return suite;
        });
        suites = suites.sort(function(a, b) {
            return a.get("rate") < b.get("rate") ? 1 : -1;
        });
        return suites;
    }
    
    private selectSuiteToBeCopied(): Promise<TerminalFlow<ActionResult>> {
        if (this.workingWith != WorkType.SUITE) {
            Util.vorpal.log(`Can only be used if working with a suite`);
            return Promise.resolve(new TerminalFlow<ActionResult>(FlowDirection.NEXT, new ActionResult()));
        }
        const selected_suite: SabreSuite = this.workingItem as SabreSuite;
        let similar_suites: SabreSuite[] = this.getSuitesWithSimilarDescription(selected_suite);
        if (similar_suites.length == 0) {
            Util.vorpal.log(`No suites to be picked`);
            return Promise.resolve(new TerminalFlow<ActionResult>(FlowDirection.NEXT, new ActionResult()));
        } else {
            if (similar_suites[0].get("rate") == 1) {
                Util.vorpal.log(`Found suite with exact match description, Automatic choose`);
                this.applySuiteImagesFromAnotherSuite(similar_suites[0], this.suite!);
                return Promise.resolve(new TerminalFlow<ActionResult>(FlowDirection.NEXT, new ActionResult()));
            } else {
                Util.vorpal.log(`No other suites with exact match description, user have to choose`);
                Util.vorpal.log(`Current Suite description: ${Util.printValue(selected_suite.get('description'))}`);
                Util.vorpal.log(`Displaying Suites by its description, omitting zero images`);
                let choices: Array<any> = new Array<any>();
                choices.push(new InquirerSelectSuiteByItsDescriptionAnswer("Return to previous screen", -1));
                choices.push(new Util.inquirer.Separator());

                let i = 0;
                choices = _.concat(choices, _.map( similar_suites ,
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
                        this.applySuiteImagesFromAnotherSuite(selected_suite, this.suite!);
                        return Promise.resolve(new TerminalFlow<ActionResult>(FlowDirection.NEXT, new ActionResult()));
                    }
                });
            }
        }
    }

    private applySuiteImagesFromAnotherSuite(source: SabreSuite, destination: SabreSuite): void {
        let _src = new InquirerSelectSuiteAnswer("", source, 0);
        let _dst = new InquirerSelectSuiteAnswer("", destination, 0);
        Util.vorpal.log(`Apply suite images`);
        Util.vorpal.log(` From: ${_src.name}`);
        Util.vorpal.log(` To: ${_dst.name}`);
        let suites: SabreSuite[] = this.hotel.get("suites");
        let new_suites: SabreSuite[] = _.map(suites, (suite) => {
            if (destination.get("sabreID") === suite.get("sabreID")) {
                suite.set("images", source.get('images'));
                Util.vorpal.log(`Copied ${Util.printValue(source.get('images').length)} image(s)`);
            }
            return suite;
        });
        this.hotel.set("suites", new_suites);
        Util.vorpal.log(`Done`);
    }

    private smartSuiteImageApplier(): Promise<TerminalFlow<ActionResult>> {
        if (this.workingWith != WorkType.HOTEL) {
            Util.vorpal.log(`Can only be used if working with a hotel`);
            return Promise.resolve(new TerminalFlow<ActionResult>(FlowDirection.NEXT, new ActionResult()));
        }
        Util.vorpal.log(`Scan new suites in this hotel...`);
        let new_suites: SabreSuite[] = _.filter(this.hotel.get("suites") as SabreSuite[], (suite) => {
            let unverified_changes = suite.get('changes_log') as Array<DescriptionChangeLog>;
            let is_verified = suite.get('verified');
            let unverified_changes_count = 0;
            let description_change = false;
            let is_new_suite = false;
            for (let log of unverified_changes) {
                if (!log.verified) {
                    unverified_changes_count += 1;
                    if (log.label == "description") {
                        description_change = true;
                    }
                }
            }
            if (unverified_changes_count == 0 && !is_verified) {
                is_new_suite = true;
            }
            return is_new_suite;
        }) as SabreSuite[];

        Util.vorpal.log(`Found ${Util.printValue(new_suites.length)} new suite(s)`);
        let i = 0;
        let p = 0;
        let s = 0;
        let e = 0;
        for (let new_suite of new_suites) {
            let _dst = new InquirerSelectSuiteAnswer("", new_suite, 0);
            Util.vorpal.log(`[${i+1}/${new_suites.length}] Procesing ${_dst.name}`);
            let similar_suites: SabreSuite[] = this.getSuitesWithSimilarDescription(new_suite);
            if (similar_suites.length == 0) {
                Util.vorpal.log(` No suites to be picked`);
                e++;
            } else {
                if (similar_suites[0].get("rate") == 1) {
                    Util.vorpal.log(` Found suite with exact match description`);
                    this.applySuiteImagesFromAnotherSuite(similar_suites[0], new_suite);
                    p++;
                } else {
                    Util.vorpal.log(` No exact match description found, skip`);
                    s++;
                }
            }
            i++;
        }
        Util.vorpal.log(`Complete! ${Util.printValue(p)} Processed, ${Util.printValue(s)} Skiped, ${Util.printValue(e)} Ignored`);
        return Promise.resolve(new TerminalFlow<ActionResult>(FlowDirection.NEXT, new ActionResult()));
    }

    private verifySuiteChangeLogs(sample?: SabreSuite): Array<SabreSuite> {
        let suites: SabreSuite[] = this.hotel.get("suites");
        for (let i = 0; i < suites.length; i++) {
            let change = true;
            if (sample) {
                change = false;
                if (sample.get("sabreID") == suites[i].get("sabreID")) {
                    change = true;
                }
            }
            if (change) {
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
        return suites;
    }

    private commitChanges(): Promise<TerminalFlow<ActionResult>> {
        Util.vorpal.log(`Saving changes`);
        Util.spinner.start();
        return new Promise<boolean>((resolve, reject) => {
            let suites: SabreSuite[] = this.hotel.get("suites");
            if (this.workingWith == WorkType.SUITE) {
                const suite: SabreSuite = this.workingItem as SabreSuite;
                suites = this.verifySuiteChangeLogs(suite);
            } else if (this.workingWith == WorkType.HOTEL) {
                suites = this.verifySuiteChangeLogs();
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