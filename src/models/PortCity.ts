export default class PortCity {
    public name?: string;
    public searchterm?: string;

    public constructor(
        public city: string, 
        public country: string, 
        public countrycode:string,
        public iata: string) {
    }
}