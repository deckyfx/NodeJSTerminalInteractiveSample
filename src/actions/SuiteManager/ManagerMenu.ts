import { InquirerIndexedAnswer } from "../../repositories/hotelrepository/InquirerAnswer";
import TerminalFlow from "./TerminalFlow";
import Util from "../../Util";
import FlowDirection from "./FlowDirection";

export default class ManagerMenu {

    public Resolve(): Promise<TerminalFlow<number>> {
        return this.SelectMenu();
    }

    private SelectMenu(): Promise<TerminalFlow<number>> {
        let choices: Array<any> = new Array<any>();
        choices.push(new InquirerIndexedAnswer("Exit", 0));
        choices.push(new InquirerIndexedAnswer("Scan hotel which contains suites with empty images", 1));
        choices.push(new InquirerIndexedAnswer("Scan hotel which the suites are recently changed", 2));
        choices.push(new InquirerIndexedAnswer("Manage hotel and suite images manually", 3));
        choices.push(new Util.inquirer.Separator());
        return Util.prompt<InquirerIndexedAnswer>({
            type: 'list',
            message: "Pick an action",
            name: 'value',
            choices: choices,
            pageSize: 15,
            default: 0
        }).then((answer) => {
            let val = answer.value!;
            let choice = val as number;
            switch (choice) {
                default: {
                    return Promise.resolve(new TerminalFlow<number>(FlowDirection.PREVIOUS, val));
                } break;
                case 1: 
                case 2:
                case 3: {
                    return Promise.resolve(new TerminalFlow<number>(FlowDirection.NEXT, val!));
                } break;
            }
        });
    }
}