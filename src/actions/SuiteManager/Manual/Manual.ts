import _ = require("lodash");

import TerminalFlow from "../TerminalFlow";
import FlowDirection from "../FlowDirection";
import SabreCity from "../../../models/SabreCity";
import SabreHotel from "../../../models/SabreHotel";
import SabreSuite from "../../../models/SabreSuite";

import HotelAndSuiteResolver, { HotelAndSuiteResolverResult } from "../HotelAndSuiteResolver";

import SearchCity from "./SearchCity";
import SelectHotel from "./SelectHotel";
import SelectSuite from "./SelectSuite";

export default class Manual extends HotelAndSuiteResolver {
    private CityResolver?: SearchCity;
    private HotelResolver?: SelectHotel;
    private SuiteResolver?: SelectSuite;
    private CityResolved?: SabreCity;
    private HotelResolved?: SabreHotel;
    private SuiteResolved?: SabreSuite;

    public Resolve(): Promise<TerminalFlow<HotelAndSuiteResolverResult>> {
        this.CityResolver = new SearchCity();
        return this.CityResolver!.Resolve()
        .then((flow) => {
            switch (flow.direction) {
                case FlowDirection.NEXT: {
                    this.CityResolved = flow.data!
                    this.HotelResolver = new SelectHotel(this.CityResolved);
                    return this.resolveHotel();
                };
            }
            return Promise.reject("Unhandled flow");
        })
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
                    return this.Resolve();
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