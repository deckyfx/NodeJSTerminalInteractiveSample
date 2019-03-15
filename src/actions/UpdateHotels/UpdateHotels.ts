
import Util from "../../Util";
import ActionBase from "./../ActionBase";
import mongo, { MongoDB } from "../../MongoDB";
import Task from "../../models/Task";
import SabreHotel from "../../models/SabreHotel";
import _ = require("lodash");
import HotelRepository from "../../repositories/HotelRepository";
import UpdateHotelTaskRequest from "../../models/UpdateHotelTaskRequest";

type CommandArgument = { 
    [key:string]: any, 
    sabreID?: Array<string>, 
    options?: { 
        [key:string]: any,
        forever?: boolean,
        once?: boolean,
        add?: boolean,
    } 
}

export default class UpdateHotels extends ActionBase {
    
    private HotelRepository: HotelRepository = new HotelRepository();
    private tasksProgress: number = 0;
    private tasksSize: number = 0;

    static build(args: CommandArgument, next: Function): void {
        try {
            (new UpdateHotels(next, args)).run();
        } catch (e) {
            Util.vorpal.log('Something wrong happened!');
            console.error(e);
        }
    }

    public constructor(public next: Function, public args?: CommandArgument) {
        super(next, args);
    }

    protected run(): number {
        this.ParseRunMode()
        .then((result) => {
            this.next();
        }).catch((e) => {
            console.log(e);
            this.next();
        })
        return 0;
    }

    private ParseRunMode(): Promise<boolean> {
        return new Promise<boolean>((resolve, reject) => {
            if (this.args!.sabreID) {
                this.LoadHotelsFromMongo(this.args!.sabreID!)
                .then(() => {
                    resolve(true);
                })
            } else if (this.args!.options!.forever) {
                this.GetUpdateRequest()
                .then(() => {
                    resolve(true);
                })
            } else if (this.args!.options!.once) {
                this.GetUpdateRequest()
                .then(() => {
                    resolve(true);
                })
            }
        })
    }

    private LoadHotelsFromMongo(sabreids: Array<string>): Promise<void> {
        return mongo.connect()
        .then((mongo: MongoDB) => {
            let _sabreids: Array<String> = _.map(sabreids, (sabreid) => {
                return new String(sabreid);
            });

            if (this.args!.options!.add) {
                Util.vorpal.log(`Try to Add new hotels`);
                let hotels: Array<SabreHotel> = _.map(_sabreids, (_sabreid) => {
                    let hotel = new mongo.models.SabreHotel!();
                    hotel.set("sabreID", _sabreid);
                    hotel.set("sabreName", `Hotel name Temp: ${_sabreid}`);
                    hotel.set("city", `City name Temp: ${_sabreid}`);
                    return hotel;
                })
                return Promise.resolve(hotels);
            } else {                
                Util.vorpal.log(`Searching tasks from mongo DB`);
                Util.spinner.start();
                return new Promise<Array<SabreHotel>>((resolve, reject) => {
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
            }
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

    private GetUpdateRequest(): Promise<boolean> {
        return mongo.connect()
        .then((mongo: MongoDB) => {
            Util.vorpal.log(`Searching update tasks from mongo DB`);
            Util.spinner.start();
            return new Promise<Array<UpdateHotelTaskRequest>>((resolve, reject) => {
                let search_condition = [{
                    $lookup: {
                        from: "sabrehotels",
                        localField: "sabreID",
                        foreignField: "sabreID",
                        as: "aggregated_hotel"
                    }
                }];
                mongo.models.UpdateHotelTaskRequest!.aggregate(search_condition, (e: any, docs: Array<UpdateHotelTaskRequest>) => {
                    if (e) return resolve([]);
                    return resolve(docs);
                })
            })
        })
        .then((update_tasks)=> {
            Util.spinner.stop();
            if (update_tasks.length == 0) {
                Util.vorpal.log(`No update task`);
                return this.DoneUpdating();
            } else {
                Util.vorpal.log(`Found ${Util.printValue(update_tasks.length)} update task...`);
                let result: Array<Task> = _.map(_.filter(update_tasks, (update_task) => {
                    let _update_task = new mongo.models.UpdateHotelTaskRequest!(update_task);
                    let hotels: Array<SabreHotel> = _update_task.get("aggregated_hotel") as Array<SabreHotel>;
                    if (hotels) {
                        if (hotels.length > 0) {
                            return true;
                        }
                    }
                }) as Array<UpdateHotelTaskRequest>,
                (update_task) => {
                    let task = new Task({}, null, "");
                    task = task.reset();
                    let _update_task = new mongo.models.UpdateHotelTaskRequest!(update_task);
                    _update_task.set("_id", update_task._id);
                    let hotels: Array<SabreHotel> = _update_task.get("aggregated_hotel") as Array<SabreHotel>;
                    let hotel = new mongo.models.SabreHotel!(hotels[0]);
                    hotel.set("_id", hotels[0]._id);
                    task.setTaskFromMongo(hotel);
                    task.set("mongoid", hotels[0]._id);
                    task.set("_id", update_task._id);
                    return task;
                });
                return Promise.resolve(result)
                .then((tasks) => {
                    this.tasksSize = tasks.length;
                    Util.vorpal.log(`Executing ${Util.printValue(this.tasksSize)} tasks`);
                    return Util.SequencePromises<Task, Task>(tasks, this.SearchHotelBridgeThenRemoveUpdateTask.bind(this))
                    .then((tasks) => {
                        // repeat
                        Util.vorpal.log(`Done`);
                        return this.DoneUpdating();
                    });
                })
            }
        })
    }

    private DoneUpdating(): Promise<boolean> {
        if (this.args!.options!.forever) {
            Util.vorpal.log(`repeat after delay 5 seconds`);
            return new Promise<void>((resolve, reject) => {
                setTimeout(() => {
                    resolve();
                }, 5000)
            }).then(() => {
                return this.GetUpdateRequest();
            })
        } else if (this.args!.options!.once) {
            return Promise.resolve(true);
        } else {
            return Promise.resolve(true);
        }
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
            return Promise.resolve(task);
        })
        .catch((e) => {
            this.tasksProgress += 1;
            return Promise.resolve(_task);
        })
    }

    private SearchHotelBridgeThenRemoveUpdateTask(_task: Task): Promise<Task> {
        let task = new Task(_task.toJSON(), null, _task.get("_id"));
        task.set("rejectOnRequestFail", true);
        Util.vorpal.log(Util.boxen(`${this.tasksProgress}/${this.tasksSize}\tRun task: "${Util.printValue(task.get("_id"))}" ` +
            `hotel: "${Util.printValue(_.first(task.get("hotelterms")!) as string)}" ` +
            `city: "${Util.printValue(_.first(task.get("cityterms")!) as string)}" `));
        return this.HotelRepository.RunSearchHotelTask(task)
        .then((task) => {
            Util.vorpal.log(" ");
            Util.vorpal.log(" ");
            this.tasksProgress += 1;
            Util.vorpal.log(`Removing update task ${task.get("_id")}`);
            return new Promise<Task>((resolve, reject) => {
                mongo.models.UpdateHotelTaskRequest!.remove({ _id: task.get("_id") }, (err) => {
                    if (err) {
                        Util.vorpal.log(`Failed to remove update task`, err);
                    } else {
                        Util.vorpal.log(`Update task removed`);
                    }
                    resolve(task);
                });
            })
        })
        .catch((e) => {
            this.tasksProgress += 1;
            return mongo.models.UpdateHotelTaskRequest!.update({ _id: task.get("_id") }, {
                e: e 
            }, (err) => {
                Util.vorpal.log(`Failed to update update task contains error`);
            })
        })
    }
}