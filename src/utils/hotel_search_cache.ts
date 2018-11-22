import * as Backbone from "backbone";
import * as _ from "lodash";
import * as fs from "fs"
import * as path from "path"
import Task from "../models/Task";

export class HotelSearchCache extends Backbone.Collection<Task> {
    private static instance: HotelSearchCache;

    private filepath:string = path.join("caches", "hotel_search.json");

    static getInstance(force?: boolean) {
        if (!HotelSearchCache.instance || force) {
            HotelSearchCache.instance = new HotelSearchCache();
            // ... any one time initialization goes here ...
        }
        return HotelSearchCache.instance;
    }

    public searchTask(task: Task): Task | null {
        let models = _.clone(this.models);
        models = _.filter(models, (model) => {
            return model.get("_id") == task._id;
        });
        return (models.length > 0)? new Task(models[0].toJSON(), null, models[0].get("_id")) : null;
    }

    public searchTaskPosition(task: Task): number {
        let result = -1;
        let models = _.clone(this.models);
        models.every((v:Task, i: number, a:Array<Task>) => {
            if (v.get("_id") == task.get("_id")) {
                result = i;
                return false;
            }
            return true;
        });
        return result;
    }

    public searchTaskWithCityTerm(task: Task): Task | null {
        let models = _.clone(this.models);
        models = _.filter(models, (model) => {
            return _.includes(model.get("cityterms"), _.first(task.cityterms));
        });
        return (models.length > 0)? new Task(models[0].toJSON(), null, models[0].get("_id")) : null;
    }

    public searchTaskWithHotelTerm(task: Task): Task | null {
        let models = _.clone(this.models);
        models = _.filter(models, (model) => {
            return _.includes(model.get("hotelterms"), _.first(task.hotelterms));
        });
        return (models.length > 0)? new Task(models[0].toJSON(), null, models[0].get("_id")) : null;
    }  

    public searchTaskWithSearchTerm(task: Task): Task | null {
        let models = _.clone(this.models);
        models = _.filter(models, (model) => {
            return _.includes(model.get("hotelterms"), _.first(task.hotelterms)) && 
                _.includes(model.get("cityterms"), _.first(task.cityterms));
        });
        return (models.length > 0)? new Task(models[0].toJSON(), null, models[0].get("_id")) : null;
    }  

    public save(task: Task): void {
        let pos = this.searchTaskPosition(task);
        if (pos == -1) {
            this.add(task);
        } else {
            this.remove(this.at(pos));
            this.add(task);
        }
        this.saveAll();
    }

    public saveAll(): void {
        fs.writeFileSync(this.filepath, JSON.stringify(this.toJSON(), null, 4));
    }

    public reload() {
        this.reset(HotelSearchCache.load());
    }
    
    public static load(): Array<Task> {
        let path = "./caches/hotel_search.json";
        try {
            fs.writeFileSync(path, "[]", { flag: 'wx' });
        } catch (e) {
        }
        return JSON.parse(fs.readFileSync(path).toString()) as Array<Task>;
    }

    private constructor() {
        super();
        this.reload();
    }
}

export default HotelSearchCache.getInstance();