
import Util from "../../Util";
import DataManager from "../../repositories/DataManager";
import ActionBase from "./../ActionBase";
import mongo, { MongoDB } from "../../MongoDB";
import Task from "../../models/Task";
import SabreHotel from "../../models/SabreHotel";
import { resolve } from "bluebird";
import _ = require("lodash");
import HotelRepository from "../../repositories/HotelRepository";

export default class UpdateHotels extends ActionBase {
    
    private HotelRepository: HotelRepository = new HotelRepository();
    private tasksProgress: number = 0;
    private tasksSize: number = 0;

    static build(args: { [key:string]: any, sabreID: Array<string> }, next: Function): void {
        try {
            (new UpdateHotels(next, args)).run();
        } catch (e) {
            Util.vorpal.log('Something wrong happened!');
            console.error(e);
        }
    }

    public constructor(public next: Function, public args?: { [key:string]: any, sabreID: Array<string> }) {
        super(next, args);
    }

    protected run(): number {
        this.LoadTasksFromMongo(this.args!.sabreID)
        .then(() => {
            this.next();
        }).catch((e) => {
            console.log(e);
            this.next();
        })
        return 0;
    }

    private LoadTasksFromMongo(sabreids: Array<string>): Promise<void> {
        return mongo.connect()
        .then((mongo: MongoDB) => {
            Util.vorpal.log(`Searching tasks from mongo DB`);
            Util.spinner.start();
            return new Promise<Array<SabreHotel>>((resolve, reject) => {
                let _sabreids: Array<String> = _.map(sabreids, (sabreid) => {
                    return new String(sabreid);
                });
                let search_condition = { $and: [ 
                    { sabreID : { $exists : true } }, 
                    { sabreName : { $exists : true } }, 
                    { city : { $exists : true } },
                    { sabreID: { $in: _sabreids } } ] };
                mongo.models.SabreHotel!.find(search_condition, (e, docs) => {
                    if (e) return resolve([]);
                    return resolve(docs);
                })
            })
        })
        .then((hotels)=> {
            Util.spinner.stop();
            Util.vorpal.log(`Found ${Util.printValue(hotels.length)} hotels...`);
            let result: Array<Task> = _.map(hotels, (hotel) => {
                let task = new Task({}, null, "");
                task = task.reset();
                task.setTaskFromMongo(hotel);
                return task;
            });
            return Promise.resolve(result);
        }).then((tasks) => {
            this.tasksSize = tasks.length;
            Util.vorpal.log(`Executing ${Util.printValue(this.tasksSize)} tasks`);
            return Util.SequencePromises<Task, Task>(tasks, this.SearchHotelBridge.bind(this))
            .then((tasks) => {
                return Promise.resolve();
            });
        })
    }

    private SearchHotelBridge(_task: Task): Promise<Task> {
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
}