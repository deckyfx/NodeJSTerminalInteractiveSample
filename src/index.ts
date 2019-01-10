import InitializeHotel from "./actions/InitializeHotel";
import mongo, { MongoDB } from "./MongoDB";
import Util from "./Util";
import SearchLocation from "./actions/SearchLocation";
import SearchHotel from "./actions/SearchHotel";
import FromCSV from "./actions/FromCSV";
import TaskHistory from "./actions/TaskHistory";
import ResetIcons from "./actions/ResetIcons";
import FixIcons from "./actions/FixIcons";
import SuiteImages from "./actions/SuiteImages";
import SuiteManager from "./actions/SuiteManager";
import HotelsImagesCounter from "./actions/HotelsImagesCounter";
import Cleanup from "./Cleanup";
import SessionRepository from "./repositories/SessionRepository";
import APIServer from "./actions/APIServer/APIServer";

export class Startup {
    public static main(): number {
        new Cleanup((exitCode: any, signal: any) => {
            console.log("Cleaning up before exit");
            SessionRepository.closeSession();
            return true;
        }, {
            ctrl_C: "{^C}",
            uncaughtException: "Uh oh. Look what happened:"
        });

        // Init MongoDB
        MongoDB.getInstance().connect().then(
            () => {

                // Should connect to monggose 
                Util.vorpal
                    .command('inithotels')
                    .description('Initialize mongo\'s sabre_hotels collection from hotels, (Warning, will clear all data)')
                    .option('-f, --force', 'Force mode, answer yes for all questions')
                    .alias('init-hotels')
                    .action(InitializeHotel.build);

                Util.vorpal
                    .command('searchlocation <term>')
                    .description('Search location to obtain city airports code')
                    .alias('search-location')
                    .action(SearchLocation.build);

                Util.vorpal
                    .command('searchhotel [cityname] [hotelname]')
                    .description('Search hotel by city name and hotel name')
                    .alias('search-hotel')
                    .action(SearchHotel.build);

                Util.vorpal
                    .command('fromcsv <path>')
                    .description('Process from CSV')
                    .alias('from-csv')
                    .action(FromCSV.build);

                Util.vorpal
                    .command('taskhistory')
                    .description('Manage task histories')
                    .alias('task-history')
                    .action(TaskHistory.build);

                Util.vorpal
                    .command('reseticons')
                    .description('Reset icons')
                    .alias('reset-icons')
                    .action(ResetIcons.build);

                Util.vorpal
                    .command('fixicons <path>')
                    .description('Fix icons')
                    .alias('fix-icons')
                    .action(FixIcons.build);

                Util.vorpal
                    .command('suitesimages <path>')
                    .description('Insert Suites Images')
                    .alias('suites-images')
                    .action(SuiteImages.build);

                Util.vorpal
                    .command('suitesmanager')
                    .description('Manage Hotel Suites')
                    .alias('suites-manager')
                    .action(SuiteManager.build);

                Util.vorpal
                    .command('hotelsimagescounter')
                    .description('Count hotels images')
                    .alias('hotels-images-counter')
                    .action(HotelsImagesCounter.build);

                Util.vorpal
                    .command('apiserver')
                    .description('Start API Server')
                    .alias('api-server')
                    .action(APIServer.build);    

                Util.vorpal
                    .delimiter(Util.clc.blue('myapp$'))
                    .parse(process.argv)
                    .show();
            }
        );

        return 0;
    }
}

Startup.main();
