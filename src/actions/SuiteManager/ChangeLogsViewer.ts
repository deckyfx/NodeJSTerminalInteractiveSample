import { DescriptionChangeLog } from "../../models/SabreSuite";
import TerminalFlow from "./TerminalFlow";
import { ActionResult } from "./ImageManagerAction";
import Util from "../../Util";
import { InquirerSelectSabreImageAnswer, InquirerSelectChangeLogAnswer } from "../../repositories/hotelrepository/InquirerAnswer";
import FlowDirection from "./FlowDirection";
import _ = require("lodash");

export default class ChangeLogsViewer {
    public constructor(private changelogs?:Array<DescriptionChangeLog>) {
    }

    public Resolve(): Promise<TerminalFlow<ActionResult>>{
        Util.vorpal.log(` `);
        Util.vorpal.log(`--------------------------------`);
        Util.vorpal.log(`Display non-verified change logs`);
        let choices: Array<any> = new Array<any>();
        choices.push(new InquirerSelectSabreImageAnswer(`Return to previous screen`, 0));
        choices.push(new Util.inquirer.Separator());
        choices = _.concat(choices, _.map(this.changelogs, (changelog) => {
            choices.push(new InquirerSelectChangeLogAnswer("", changelog));
        }));
        choices = _.filter(choices, (choice) => {
            return choice !== undefined;
        });
        choices.push(new Util.inquirer.Separator());
        return Util.prompt<InquirerSelectChangeLogAnswer>({
            type: 'list',
            message: "Select changes you want to see",
            name: 'value',
            choices: choices,
            pageSize: 15,
            default: 0
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
                Util.vorpal.log(` `);
                Util.vorpal.log(`--------------------------------`);
                Util.vorpal.log(`Displaying change for path ${val.label} by ${val.write_by}`);
                Util.vorpal.log(`--------------------------------`);
                Util.vorpal.log(`Old Value: ${val.oldvalue}`);
                Util.vorpal.log(`New Value: ${val.newvalue}`);
                return this.Resolve();
            }
        });
    }
}