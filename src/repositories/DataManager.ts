import CityRepository from "./CityRepository";
import SabreCity from "../models/SabreCity";
import SabreHotel from "../models/SabreHotel";
import HotelRepository from "./HotelRepository";
import FromCSV from "./FromCSV";
import PortCity from "../models/PortCity";
import Task from "../models/Task";
import LocationRepository from "./LocationRepository";
import SeedHotelRepository from "./SeedHotelRepository";

export default abstract class DataManager {
    public static SeedSabreCities(): Promise<Array<SabreCity>> {
        return (new CityRepository()).SeedSabreCities();
    }

    public static SeedSabreHotels(): Promise<Array<SabreHotel>> {
        return (new SeedHotelRepository()).SeedSabreHotels();
    }
    public static SearchLocation(term: string, options: any): Promise<Array<PortCity>>  {
        return (new LocationRepository()).SearchLocation(term, options);
    }

    public static SearchHotel(city: string, hotel:string, options: any): Promise<Task> {
        return (new HotelRepository()).SearchHotel(city, hotel, options);
    }

    public static FromCSV(path: string, options: any): Promise<Array<Task>> {
        return (new FromCSV()).FromCSV(path, options);
    }
}
