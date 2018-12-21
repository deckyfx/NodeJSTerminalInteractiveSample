
import SabreHotel from "../../models/SabreHotel";
import SabreSuite from "../../models/SabreSuite";

import ImageManagerAction from "./ImageManagerAction";
import FlowDirection from "./FlowDirection";
import TerminalFlow from "./TerminalFlow";
import ManagerMenu from "./ManagerMenu";

import HotelAndSuiteResolver from "./HotelAndSuiteResolver";
import Manual from "./Manual/Manual";
import EmptyImages from "./EmptyImages/EmptyImages";
import RecentlyChanged from "./RecentlyChanged/RecentlyChanged";

export default class ManagerMain {

    private SuiteAndHotelResolver?: HotelAndSuiteResolver;
    private hotel?: SabreHotel;
    private suite?: SabreSuite;

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
                    switch (flow.data!) {
                        case 1: {
                            this.SuiteAndHotelResolver = new EmptyImages();
                        } break;
                        case 2: {
                            this.SuiteAndHotelResolver = new RecentlyChanged();
                        } break;
                        case 3: {
                            this.SuiteAndHotelResolver = new Manual();
                        } break;
                        default : {
                            return Promise.reject("Unhandled flow");
                        } break;
                    }
                    return this.SuiteAndHotelResolver!.Resolve()
                    .then((flow) => {
                        switch (flow.direction) {
                            case FlowDirection.NEXT: {
                                this.hotel = flow.data!.hotel;
                                this.suite = flow.data!.suite;
                                return this.SelectAction();
                            } break;
                            case FlowDirection.PREVIOUS: {
                                return this.SelectMenu();
                            };
                        }
                        return Promise.reject("Unhandled flow");
                    });
                } break;
                case FlowDirection.PREVIOUS: {
                    return Promise.resolve(new TerminalFlow<any>(FlowDirection.PREVIOUS));
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
                    return this.SuiteAndHotelResolver!.OnBackSignal()
                    .then((flow) => {
                        switch (flow.direction) {
                            case FlowDirection.NEXT: {
                                this.hotel = flow.data!.hotel;
                                this.suite = flow.data!.suite;
                                return this.SelectAction();
                            } break;
                            case FlowDirection.PREVIOUS: {
                                return this.SelectMenu();
                            };
                        }
                        return Promise.reject("Unhandled flow");
                    });
                };
            }
            return Promise.reject("Unhandled flow");
        });
    }
}