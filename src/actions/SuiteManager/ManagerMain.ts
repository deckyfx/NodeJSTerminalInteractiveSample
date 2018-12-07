import SelectCity from "./SelectCity";
import FlowDirection from "./FlowDirection";
import SelectHotel from "./SelectHotel";
import TerminalFlow from "./TerminalFlow";
import SabreHotel from "../../models/SabreHotel";
import SabreCity from "../../models/SabreCity";
import SelectSuite from "./SelectSuite";
import SabreSuite from "../../models/SabreSuite";
import ImageManagerAction from "./ImageManagerAction";
import ManagerMenu from "./ManagerMenu";
import EmptyImagesScanner from "./EmptyImagesScanner";

export default class ManagerMain {
    private city: SabreCity | undefined;
    private hotel: SabreHotel | undefined;
    private suite: SabreSuite | undefined;
    private HotelResolver: SelectHotel | undefined;
    private scanMode:boolean = false;

    public Resolve(): Promise<boolean> {
        return this.SelectMenu()
        .then((flow) => {
            switch (flow.direction) {
                case FlowDirection.NEXT: {
                    return Promise.resolve(true);
                };
                case FlowDirection.PREVIOUS: {
                    return Promise.resolve(false);
                };
            }
            return Promise.reject("Unhandled flow");
        });
    }

    private SelectMenu(): Promise<TerminalFlow<any>>{
        let Resolver = new ManagerMenu();
        return Resolver.Resolve()
        .then((flow) => {
            switch (flow.direction) {
                case FlowDirection.NEXT: {
                    switch(flow.data!) {
                        case 1: {
                            this.scanMode = true;
                            return this.ScanHotels();
                        } break;
                        case 2: {
                            this.scanMode = false;
                            return this.SelectCity();
                        } break;
                    }
                } break;
                case FlowDirection.PREVIOUS: {
                    return Promise.resolve(new TerminalFlow<any>(FlowDirection.PREVIOUS));
                };
            }
            return Promise.reject("Unhandled flow");
        });
    }

    private ScanHotels(): Promise<TerminalFlow<any>>{
        let Resolver = new EmptyImagesScanner();
        return Resolver.Resolve()
        .then((flow) => {
            switch (flow.direction) {
                case FlowDirection.NEXT: {
                    this.HotelResolver = new SelectHotel();
                    this.HotelResolver.resolvedHotel = Resolver.resolvedHotel;
                    return this.SelectHotel(true);
                } break;
                case FlowDirection.PREVIOUS: {
                    return this.SelectMenu();
                };
            }
            return Promise.reject("Unhandled flow");
        });
    }

    private SelectCity(): Promise<TerminalFlow<any>>{
        let Resolver = new SelectCity();
        return Resolver.Resolve()
        .then((flow) => {
            switch (flow.direction) {
                case FlowDirection.NEXT: {
                    this.city = flow.data!
                    return this.SelectHotel();
                } break;
                case FlowDirection.PREVIOUS: {
                    return this.SelectMenu();
                };
            }
            return Promise.reject("Unhandled flow");
        });
    }

    private SelectHotel(usecache?: boolean): Promise<TerminalFlow<any>>{
        if (!usecache) {
            this.HotelResolver = new SelectHotel(this.city!, this.scanMode);
        }
        return this.HotelResolver!.Resolve()
        .then((flow) => {
            switch (flow.direction) {
                case FlowDirection.NEXT: {
                    this.hotel = flow.data!
                    return this.SelectSuite();
                } break;
                case FlowDirection.PREVIOUS: {
                    if (this.scanMode) {
                        return this.SelectMenu();
                    } else {
                        return this.SelectCity();
                    }
                };
            }
            return Promise.reject("Unhandled flow");
        });
    }

    private SelectSuite(): Promise<TerminalFlow<any>>{
        let Resolver = new SelectSuite(this.hotel!, this.scanMode);
        return Resolver.Resolve()
        .then((flow) => {
            switch (flow.direction) {
                case FlowDirection.NEXT: {
                    this.suite = flow.data!
                    return this.SelectAction();
                } break;
                case FlowDirection.PREVIOUS: {
                    return this.SelectHotel(true);
                };
            }
            return Promise.reject("Unhandled flow");
        });
    }

    private SelectAction(): Promise<TerminalFlow<any>>{
        let Resolver = new ImageManagerAction(this.hotel!, this.suite);
        return Resolver.Resolve()
        .then((flow) => {
            switch (flow.direction) {
                case FlowDirection.NEXT: {
                    return this.SelectAction();
                } break;
                case FlowDirection.PREVIOUS: {
                    return this.SelectSuite();
                };
            }
            return Promise.reject("Unhandled flow");
        });
    }
}