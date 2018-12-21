import SabreHotel from "../../../models/SabreHotel";
import SabreSuite from "../../../models/SabreSuite";

import TerminalFlow from "../TerminalFlow";
import FlowDirection from "../FlowDirection";
import HotelAndSuiteResolver, { HotelAndSuiteResolverResult } from "../HotelAndSuiteResolver";

import SelectHotel from "./SelectHotel";
import SelectSuite from "./SelectSuite";


export default class EmptyImages extends HotelAndSuiteResolver {  
    
    private HotelResolver?: SelectHotel;
    private SuiteResolver?: SelectSuite;
    private HotelResolved?: SabreHotel;
    private SuiteResolved?: SabreSuite;

    public Resolve(): Promise<TerminalFlow<HotelAndSuiteResolverResult>> {
        this.HotelResolver = new SelectHotel();
        return this.resolveHotel();
    }

    public OnBackSignal(): Promise<TerminalFlow<HotelAndSuiteResolverResult>> {
        return this.resolveSuite();
    }

    private resolveHotel(): Promise<TerminalFlow<HotelAndSuiteResolverResult>> {
        return this.HotelResolver!.Resolve()
        .then((flow) => {
            switch (flow.direction) {
                case FlowDirection.NEXT: {
                    this.HotelResolved = flow.data!;
                    this.SuiteResolver = new SelectSuite(this.HotelResolved);
                    return this.resolveSuite()
                };
                case FlowDirection.PREVIOUS: {
                    return Promise.resolve(new TerminalFlow<HotelAndSuiteResolverResult>(FlowDirection.PREVIOUS));
                };
            }
            return Promise.reject("Unhandled flow");
        })
    }

    private resolveSuite(): Promise<TerminalFlow<HotelAndSuiteResolverResult>> {
        return this.SuiteResolver!.Resolve()
        .then((flow) => {
            switch (flow.direction) {
                case FlowDirection.NEXT: {
                    this.SuiteResolved = flow.data!;
                    return Promise.resolve(new TerminalFlow(FlowDirection.NEXT, {hotel: this.HotelResolved!, suite: this.SuiteResolved!}));
                };
                case FlowDirection.PREVIOUS: {
                    return this.resolveHotel()
                };
            }
            return Promise.reject("Unhandled flow");
        })
    }
}