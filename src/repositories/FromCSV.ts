import RepositoryBase from "./RepositoryBase";
import * as Papa from "papaparse";
import * as fs from "fs";
import HotelRepository from "./HotelRepository";
import Util from "../Util";
import Task from "../models/Task";
import HotelSearchCache from "../utils/hotel_search_cache";

export default class FromCSV extends RepositoryBase {
    public HotelRepository: HotelRepository = new HotelRepository();
    private tasksSize: number = 0;
    private tasksProgress: number = 1;

    public SearchHotelBridge(source: HotelSource): Promise<Task> {
        HotelSearchCache.reload();
        Util.vorpal.log(Util.boxen(`${this.tasksProgress}/${this.tasksSize}\tFrom CSV: "${Util.printValue(source.hotel!)}" ` +
            `in "${Util.printValue(source.iata!)} (${Util.printValue(source.state!)} - ${Util.printValue(source.country!)})"`));
        return this.HotelRepository.SearchHotel(source.iata!, source.hotel!, {})
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

    public FromCSV(path: string, option: any): Promise<Array<Task>> {
        // HotelSearchCache.getInstance().resetCollections();
        return new Promise<Array<HotelSource>>( (resolve, reject) => {
            // Parse local CSV file
            Papa.parse(fs.readFileSync(path).toString(), {
                complete: (results) => {
                    resolve(results.data as Array<HotelSource>);
                },
                header: true
            });
        })
        .then( (hotelsources) => {
            this.tasksSize = hotelsources.length;
            Util.vorpal.log(`Executing ${Util.printValue(this.tasksSize)} tasks`);
            return Util.SequencePromises<HotelSource, Task>(hotelsources, this.SearchHotelBridge.bind(this));
        })
    }
}

export class HotelSource {
    public country?: string;
    public iata?: string;
    public state?: string;
    public hotel?: string;
    public note?: string;
}