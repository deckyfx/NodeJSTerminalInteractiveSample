import Task from "../../models/Task";
import Util from "../../Util";
import * as _ from "lodash";
import { InquirerIndexedAnswer } from "./InquirerAnswer";

export default class TaskHistory {
    public constructor() {
    }

    public LookupTask(task: Task): Promise<Task | null> {
        // return null to skip task, or
        // return cache or task to run this task
        let caches = Util.hotelcaches.searchTaskWithSearchTerm(task);
        if (caches) {
            Util.vorpal.log(`${Util.printWarning()} Already done this task ` + 
                `${Util.printValue(_.first(task.hotelterms)!)} - ${Util.printValue(_.first(task.cityterms)!)}`);
            console.log(caches.success);
            if (!caches.success) {
                let choices = new Array<InquirerIndexedAnswer>();
                choices.push(new InquirerIndexedAnswer("Retry task", 0));
                choices.push(new InquirerIndexedAnswer("Clean retry task", 1));
                choices.push(new InquirerIndexedAnswer("Skip task", 2));
                return Util.prompt<InquirerIndexedAnswer>({
                    type: 'list',
                    name: 'value',
                    message: `This task: ${Util.printValue(_.first(task.hotelterms)!)} - ${Util.printValue(_.first(task.cityterms)!)} ended up failed, what would you do?`,
                    choices: choices,
                    default: 0
                }).then((answer) => {
                    let val = answer.value!;
                    if ( typeof(val) === "number" ) {
                        let choice = val as number;
                        switch (choice) {
                            case 0: {
                                // re-run task
                                return Promise.resolve(caches);
                            } break;
                            case 1: {
                                // re-run task with reset config
                                let _task = caches!.reset();                                
                                return Promise.resolve(_task);
                            } break;
                            default: {
                                // skip task if we select skip
                                return Promise.resolve(null);
                            } break;
                        }
                    } else {
                        // skip task if we select another option
                        return Promise.resolve(null);
                    }                    
                });
                //if (caches.e === "Error: ESOCKETTIMEDOUT") {
                //    caches = null;
                //}
            } else {
                // skip task if if previous task is success
                return Promise.resolve(null);
            }
        } else {
            // run task with original config
            return Promise.resolve(task);
        }      
    }
}