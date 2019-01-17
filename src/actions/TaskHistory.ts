import Util from "../Util";
import ActionBase from "./ActionBase";
import DataManager from "../repositories/DataManager";
import HotelSearchCache from "../utils/hotel_search_cache";
import * as _ from "lodash";
import Task from "../models/Task";
import { InquirerSelectTaskAnswer, InquirerIndexedAnswer } from "../repositories/hotelrepository/InquirerAnswer";
import HotelRepository from "../repositories/HotelRepository";
import * as fs from "fs";
import SabreCity from "../models/SabreCity";
import PortCity from "../models/PortCity";
import SabreHotel from "../models/SabreHotel";
import mongo, { MongoDB } from "../MongoDB";

export default class TaskHistory extends ActionBase {
    static buildAutoComplete: any;
    
    public HotelRepository: HotelRepository = new HotelRepository();
    private mongoHotelTasks: Array<Task> = [];

    static build(args: any, next: Function): void {
        try {
            (new TaskHistory(next, args)).run();
        } catch (e) {
            Util.vorpal.log('Something wrong happened!');
            console.error(e);
        }
    }

    private tasksSize: number = 0;
    private tasksProgress: number = 1;

    public constructor(public next: Function, public args?: any) {
        super(next, args);
    }

    protected run(): number {
        HotelSearchCache.reload();
        this.KeepAskAction();
        return 0;
    }

    private KeepAskAction(): Promise<boolean> {
        return this.WhatToDo()
        .then((complete) => {
            if (complete) {
                this.next();
                return Promise.resolve(true);
            } else {
                return this.KeepAskAction();
            }
        })
    }

    private WhatToDo(): Promise<boolean> {
        HotelSearchCache.reload();
        let choices: Array<any> = new Array<any>();
        Util.vorpal.log(`${Util.printInfo()} Keep ${Util.printValue(HotelSearchCache.length)} local task histories`);
        if (HotelSearchCache.length > 0) {
            choices.push(new InquirerIndexedAnswer("Load tasks from monggo hotels", 0));
            choices.push(new InquirerIndexedAnswer("Show all local Tasks", 1));
            choices.push(new InquirerIndexedAnswer("Show success local tasks", 2));
            choices.push(new InquirerIndexedAnswer("Show failed local tasks", 3));
            choices.push(new InquirerIndexedAnswer(`Exit`, 4));
            return Util.prompt<InquirerIndexedAnswer>({
                type: 'list',
                name: 'value',
                message: `What would yo do?`,
                choices: choices,
                default: 0
            }).then((answer) => {
                let val = answer.value!;
                if ( typeof(val) === "number" ) {
                    let choice = val as number;
                    switch (choice) {
                        case 0:
                        case 1:
                        case 2:
                        case 3: {
                            return this.SelectSelectionMode(choice)
                            .then((tasks) => {
                                if (tasks.length > 0) {
                                    return this.WhatToDoWithTasks(tasks);
                                } else {
                                    return Promise.resolve(false);
                                }
                            });
                        } break;
                        default: {
                            return Promise.resolve(true);
                        } break;
                    }
                } else {
                    return Promise.reject(new Error('Invalid action'));
                }                    
            });
        } else {
            return Promise.resolve(true);
        }        
    }

    private SelectSelectionMode(prevmode: number): Promise<Array<Task>> {
        let choices: Array<any> = new Array<any>();
        choices.push(new InquirerIndexedAnswer("Select all",        0));
        choices.push(new InquirerIndexedAnswer("Default mode",      1));
        choices.push(new InquirerIndexedAnswer("Free search mode",  2));
        return Util.prompt<InquirerIndexedAnswer>({
            type: 'list',
            name: 'value',
            message: `Will show tasks in list, select search mode`,
            choices: choices,
            default: 0
        }).then((answer) => {
            let val = answer.value!;
            if ( typeof(val) === "number" ) {
                let choice = val as number;
                switch (choice) {
                    default: {
                        switch (prevmode) {
                            case 0: {
                                return this.LoadTasksFromMongo()
                                .then(() => {
                                    return this.SelectTasks(prevmode, choice);
                                })
                            };
                            default: {
                                return this.SelectTasks(prevmode, choice);
                            }
                        }
                    };
                }
            } else {
                return Promise.reject(new Error('Invalid action'));
            }
        });
    }

    private LoadTasksFromMongo(): Promise<void> {
        return mongo.connect()
        .then((mongo: MongoDB) => {
            Util.vorpal.log(`Searching tasks from mongo DB`);
            Util.spinner.start();
            return new Promise<SabreHotel[]>((resolve, reject) => {
                let search_condition = { $and: [ { sabreID : { $exists : true } }, { sabreName : { $exists : true } }, { city : { $exists : true } } ] };
                mongo.models.SabreHotel!.find(search_condition, (e, docs) => {
                    if (e) return resolve([]);
                    return resolve(docs);
                })
            })
        })
        .then((hotels)=> {
            Util.spinner.stop();
            Util.vorpal.log(`Found ${Util.printValue(hotels.length)} hotels...`);
            this.mongoHotelTasks = _.map(hotels, (hotel) => {
                let task = new Task({}, null, "");
                task = task.reset();
                task.setTaskFromMongo(hotel);
                return task;
            });
        });
    }

    private SelectTasks(mode: number, selectmode: number): Promise<Array<Task>> {
        let tasks: Array<Task> = new Array<Task>();
        switch (mode) {
            case 0: {
                tasks = this.mongoHotelTasks;
            } break;
            case 1: {
                tasks = HotelSearchCache.models;
            } break;
            case 2: {
                tasks = HotelSearchCache.models.filter((task) => {
                    return task.get("success");
                });
            } break;
            case 3: {
                tasks = HotelSearchCache.models.filter((task) => {
                    return !task.get("success");
                });
            } break;
        }
        let searchable = true;
        switch (selectmode) {
            case 0: {
                return Promise.resolve(tasks);
            } break;
            case 1: {
                searchable = false;
            } break;
            case 2: {
                searchable = true;
            } break;
        }
        let prompt_config: any = {
            type: 'checkbox-plus',
            name: 'value',
            message: `${Util.printInfo()} Displaying task histories:`,
            pageSize: 15,
            choices: [],
            default: [],
            highlight: true,
            searchable: true,
            source: (answersSoFar: any, input: string) => { 
                return this.filterTasks(answersSoFar, input, tasks);
            }
        }
        if (!searchable) {
            prompt_config.type = 'checkbox';
            prompt_config.choices = _.map(tasks, (task) => {
                return new InquirerSelectTaskAnswer("", task);
            });
        }
        return Util.inquirer.prompt<InquirerSelectTaskAnswer>(prompt_config)
        .then((answer: InquirerSelectTaskAnswer) => {
            let _val = answer.value! as any;
            let val = _val as Array<Task>;
            if ( typeof(val) === "number" ) {
                let choice = val as number;
                switch (choice) {
                    default: {
                        return Promise.reject(new Error('Invalid input'));
                    } break;
                }
            } else {
                return Promise.resolve(val);
            }
        });
    }

    private filterTasks(answersSoFar: any, input: string, tasks: Array<Task>): Promise<Array<any>> {
        return new Promise<Array<any>>((resolve, reject) => {
            input = input || '';
            let choices: Array<any> = new Array<any>();
            if (input.length > 0) {
                let filtered = _.filter(tasks, (task) => {
                    return (new AdvanceSearchTest(task, input)).test();
                });
                choices = _.concat(choices, _.map(filtered, (task) => {
                    return new InquirerSelectTaskAnswer("", task);
                }));
            } else {
                choices = _.concat(choices, _.map(tasks, (task) => {
                    return new InquirerSelectTaskAnswer("", task);
                }));
            }
            choices.push(new Util.inquirer.Separator());
            resolve(choices);
        });
    }

    private WhatToDoWithTasks(tasks: Array<Task>): Promise<boolean> {
        let choices: Array<any> = new Array<any>();
        Util.vorpal.log(`${Util.printInfo()} Selected ${Util.printValue(tasks.length)} task(s) history`);
        if (HotelSearchCache.length > 0) {
            choices.push(new InquirerSelectTaskAnswer(`Do nothing`, 0));
            choices.push(new InquirerSelectTaskAnswer("Retry tasks", 1));
            choices.push(new InquirerSelectTaskAnswer("Retry tasks (Reset mode)", 2));
            choices.push(new InquirerSelectTaskAnswer("Set status to: FALSE", 3));
            choices.push(new InquirerSelectTaskAnswer("Set status to: FALSE (Reset mode)", 4));
            choices.push(new InquirerSelectTaskAnswer("Set status to: TRUE", 5));
            choices.push(new InquirerSelectTaskAnswer(`${Util.figures.warning} Remove`, 6));
            choices.push(new Util.inquirer.Separator());
            choices.push(new InquirerSelectTaskAnswer(`Print sabre names`, 7));
            choices.push(new Util.inquirer.Separator());
            return Util.prompt<InquirerSelectTaskAnswer>({
                type: 'list',
                name: 'value',
                message: `What would yo do with these ${Util.printValue(tasks.length)} tasks?`,
                choices: choices,
                default: 0
            }).then((answer) => {
                let val = answer.value!;
                if ( typeof(val) === "number" ) {
                    let choice = val as number;
                    switch (choice) {
                        case 0: {
                            return Promise.resolve(false);
                        } break;
                        default: {
                            return this.WithTasks(tasks, choice);
                        } break;
                    }
                } else {
                    return Promise.resolve(false);
                }                    
            });
        } else {
            return Promise.resolve(true);
        }
    }

    private WithTasks(tasks: Array<Task>, action: number): Promise<boolean> {
        switch (action) {
            case 1: {
                // Retry tasks
                let _tasks = _.map(tasks, (task) => {
                    task.set({ success: false });
                    return task;
                });
                this.tasksSize = _tasks.length;
                Util.vorpal.log(`Executing ${Util.printValue(this.tasksSize)} tasks`);
                return Util.SequencePromises<Task, Task>(_tasks, this.SearchHotelBridge.bind(this))
                .then((tasks) => {
                    return this.PreparingReport(tasks);
                });
            } break;
            case 2: {
                // Retry tasks reset mode
                let _tasks = _.map(tasks, (task) => {
                    let _task = new Task(task.toJSON(), null, task.get("_id"));
                    _task = _task.reset();
                    return _task;
                });
                this.tasksSize = _tasks.length;
                Util.vorpal.log(`Executing ${Util.printValue(this.tasksSize)} tasks`);
                return Util.SequencePromises<Task, Task>(_tasks, this.SearchHotelBridge.bind(this))
                .then((tasks) => {
                    return Promise.resolve(false);
                });
            } break;
            case 3: {
                // Set task status to false
                tasks.forEach((task) => {
                    let _task = new Task(task.toJSON(), null, task.get("_id"));
                    task.set({ success: false });
                    HotelSearchCache.set([ task ], { remove: false });
                });
            } break;
            case 4: {
                // reset task
                tasks.forEach((task) => {
                    let _task = new Task(task.toJSON(), null, task.get("_id"));
                    _task = _task.reset();
                    HotelSearchCache.remove(task);
                    HotelSearchCache.push( _task );
                });
            } break;
            case 5: {
                // Set task status to true
                tasks.forEach((task) => {
                    let _task = new Task(task.toJSON(), null, task.get("_id"));
                    task.set({ success: true });
                    HotelSearchCache.set([ task ], { remove: false });
                });
            } break;
            default: {
                // Remove tasks
                tasks.forEach((task) => {
                    HotelSearchCache.remove( task );
                });
            } break;

            case 7: {
                // Remove tasks
                let names = _.map(tasks, (task) => {
                    let hotel: SabreHotel = task.get("hotel");
                    let city: PortCity = task.get("city");
                    if (hotel) {
                        return `${hotel.sabreName} - ${city.country} - ${task.get("sabreID")}`;
                    } else {
                        return "";
                    }
                });
                let names_text = names.join("\n");
                fs.writeFileSync("./caches/hotelnames.txt", names_text);
            } break;
        }
        HotelSearchCache.saveAll();
        return Promise.resolve(false);
    }

    private SearchHotelBridge(_task: Task): Promise<Task> {
        HotelSearchCache.reload();
        let task = new Task(_task.toJSON(), null, _task.get("_id"));
        Util.vorpal.log(Util.boxen(`${this.tasksProgress}/${this.tasksSize}\tRun task: "${Util.printValue(task.get("_id"))}" ` +
            `hotel: "${Util.printValue(_.first(task.get("hotelterms")!) as string)}" ` +
            `city: "${Util.printValue(_.first(task.get("cityterms")!) as string)}" `));
        return this.HotelRepository.RunSearchHotelTask(task)
        .then((task) => {
            Util.vorpal.log(" ");
            Util.vorpal.log(" ");
            this.tasksProgress += 1;
        })
        .catch((task) => {
            this.tasksProgress += 1;
            return Promise.resolve(task);
        })
    }

    private PreparingReport(tasks: Array<Task>) : Promise<boolean> {
        let choices: Array<any> = new Array<any>();
        Util.vorpal.log(`Do you want to generate report and send it to email?`);
        if (HotelSearchCache.length > 0) {
            choices.push(new InquirerSelectTaskAnswer(`No, don't send email`, 0));
            choices.push(new InquirerSelectTaskAnswer("Send to nila@itprovent.com", 1));
            choices.push(new Util.inquirer.Separator());
            return Util.prompt<InquirerSelectTaskAnswer>({
                type: 'list',
                name: 'value',
                message: `What would yo do next?`,
                choices: choices,
                default: 0
            }).then((answer) => {
                let val = answer.value!;
                if ( typeof(val) === "number" ) {
                    let choice = val as number;
                    switch (choice) {
                        case 1: {
                            return this.GenerateReport(tasks);
                        } break;
                        default: {
                            return Promise.resolve(true);
                        } break;
                    }
                } else {
                    return Promise.resolve(true);
                }
            });
        } else {
            return Promise.resolve(true);
        }
    }

    private GenerateReport(tasks: Array<Task>) : Promise<boolean> {
        // Should generate report about
        // 1. Berapa hotel yang di retry
        // succerss berapa, failed berapa
        // hotel dan suites mana saja berubah
        // sabreName, sabreID, city.
        return Promise.resolve(true);
    }
}

class AdvanceSearchTest {
    public constructor(private task:Task, private input:string) {
    }

    public test(): boolean {
        return this.doTest(this.input);
    }

    private doTest(input: string): boolean {
        let begin_with_bracket = /(^\{)/gim
        if (begin_with_bracket.exec(input)) {
            let command_regex = /(^\{)([^\}]+)?(\}$)/gim;
            let command_input = command_regex.exec(input);
            if (command_input) {
                let command_json = JSON.parse(Util.rjson.toJson(input));
                let command_key = Object.keys(command_json)[0];
                let command_value = command_json[command_key];
                switch (command_key) {
                    case "$and" : 
                    case "$or" : {
                        return this.testTasks(command_key, command_value);
                    } break;
                    case "$eq" : 
                    case "$neq" :
                    case "$gt" : 
                    case "$lt" : 
                    case "$gte" : 
                    case "$regex" : {
                        return this.transformToTest(command_key, command_value);
                    } break;
                    case "$has" : 
                    case "$true" : 
                    case "$false" : 
                    case "$null" : 
                    case "$nnull" : {
                        if (typeof(command_value) === "string") {
                            return this.testTask(command_value, command_key);
                        }
                        return false;
                    }  break;
                    default: {
                        return this.testTask(command_key, "$auto", command_value);
                    } break;
                }
            } else {
                return false;
            }
        } else {
            let s1 = _.first(this.task.get("hotelterms")) as string || "";
            let s2 = _.first(this.task.get("cityterms")) as string || "";
            let s3 = this.task.get("sabreName") || "";
            try {
                return s1.match(new RegExp(input, "i")) != null || 
                s2.match(new RegExp(input, "i")) != null || 
                s3.match(new RegExp(input, "i")) != null;
            } catch(e) {
                return false;
            }
        }
    }

    private transformToTest(command_key:string, command_value: any): boolean {
        if (command_value.constructor === Array) {
            let command_array = (command_value as Array<any>);
            let path = command_array[0];
            let value = command_array[1];
            return this.testTask(path, command_key, value);
        }
        return false;
    }

    private testTask(path: string, operator:string, value?: any): boolean {
        let valuetest = this.task.get(path);
        switch (operator) {
            case "$eq" : {
                return valuetest === value;
            } break;
            case "$neq" : {
                return valuetest !== value;
            } break;
            case "$gt" : {
                return valuetest > value;
            } break;
            case "$lt" : {
                return valuetest < value;
            } break;
            case "$gte" : {
                return valuetest >= value;
            } break;
            case "$lte" : {
                return valuetest < value;
            } break;
            case "$regex" : {    
                return String(value).match(new RegExp(valuetest)) !== null;
            } break;
            case "$auto" : {    
                if (typeof(value) == "string") {                    
                    return value.startsWith(valuetest);
                } else if (typeof(value) == "number") {
                    return value === valuetest;
                } else {
                    return String(value).match(new RegExp(valuetest)) !== null;
                }
            } break;
            case "$has" : {
                return valuetest !== undefined;
            } break;
            case "$true" : {
                return valuetest === true;
            } break;
            case "$false" : {
                return valuetest === false;
            } break;
            case "$null" : {
                return valuetest === null;
            } break;
            case "$nnull" : {
                return valuetest !== null;
            } break;
            default: {
                return false;
            } break;
        }
    }

    private testTasks(operator:string, commands: any): boolean {
        if (commands.constructor === Array) {
            let command_array = (commands as Array<any>);
            let results = _.map(command_array, (_command) => {
                return this.doTest(_command);
            });
            switch (operator) {
                case "$or" : {
                    return results.indexOf(true) > -1
                } break;
                case "$and" : {
                    return !(results.indexOf(false) > -1)
                } break;
            }
        }
        return false;

    }
}