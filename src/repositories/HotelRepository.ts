import Util from "../Util";
import SessionRepository from "./SessionRepository";
import Task from "../models/Task";
import TaskHistory from "./hotelrepository/TaskHistory";
import CityLookup from "./hotelrepository/CityLookup";
import HotelLookup from "./hotelrepository/HotelLookup";
import SaveHotelToMongo from "./hotelrepository/SaveHotelToMongo";
import MongoCityLookup from "./hotelrepository/MongoCityLookup";

export default class HotelRepository extends SessionRepository {

    public SearchHotel(cityname: string, hotelname: string, options?: any): Promise<Task> {
        let task: Task = new Task();
        if (cityname) task.addCityTerms(cityname);
        if (hotelname) task.addHotelTerms(hotelname);
        return this.RunSearchHotelTask(task);
    }

    public RunSearchHotelTask(task: Task, force?: boolean): Promise<Task> {
        return Promise.resolve()
        .then(() => {
            if (!force) {
                return Promise.resolve(task)
            } else {
                return (new TaskHistory()).LookupTask(task)
            }
        })
        .then((task) => {
            // if task should run
            if (task) {
                return new Promise<Task>((resolve, reject) => {
                    if (task.isTaskFromMonggo()) {
                        SessionRepository.createSession()
                        .then(() => {
                            return (new HotelLookup()).LookupHotel(task)
                            .then(() => {
                                return SessionRepository.closeSession().
                                then(() => {
                                    return Promise.resolve(task);
                                });
                            })
                            .catch((e) => {                            
                                return SessionRepository.closeSession().
                                then(() => {
                                    throw e;
                                });
                            });
                        })
                        .then((task) => {
                            resolve(task);
                        })
                        .catch((e) => {
                            reject(e);
                        })
                    } else {
                        (new CityLookup()).LookupCity(task)
                        .then((task) => {
                            return SessionRepository.createSession()
                            .then(() => {
                                return (new HotelLookup()).LookupHotel(task)
                                .then(() => {
                                    return SessionRepository.closeSession().
                                    then(() => {
                                        return Promise.resolve(task);
                                    });
                                })
                                .catch((e) => {                            
                                    return SessionRepository.closeSession().
                                    then(() => {
                                        throw e;
                                    });
                                });
                            });
                        })
                        .then((task) => {
                            return (new MongoCityLookup()).LookupMongoCity(task);
                        })
                        .then((task) => {
                            resolve(task);
                        })
                        .catch((e) => {
                            reject(e);
                        })
                    }
                })
                .then((task) => {
                    return (new SaveHotelToMongo()).SaveHotel(task);
                })
                .then((task) => {
                    Util.vorpal.log(`Done!`);
                    Util.hotelcaches.save(task.finalize(null));
                    return Promise.resolve(task);
                })
                .catch((e : Error) => {
                    Util.vorpal.log("Error!: ", e);
                    Util.hotelcaches.save(task.finalize(e));
                    return Promise.reject(task);
                })
            } else {
                return Promise.resolve(task!);
            }
        })
    }
}