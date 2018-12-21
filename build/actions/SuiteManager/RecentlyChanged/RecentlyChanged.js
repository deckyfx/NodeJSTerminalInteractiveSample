"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const TerminalFlow_1 = require("../TerminalFlow");
const FlowDirection_1 = require("../FlowDirection");
const HotelAndSuiteResolver_1 = require("../HotelAndSuiteResolver");
const SelectHotel_1 = require("./SelectHotel");
const SelectSuite_1 = require("./SelectSuite");
class RecentlyChanged extends HotelAndSuiteResolver_1.default {
    Resolve() {
        this.HotelResolver = new SelectHotel_1.default();
        return this.resolveHotel();
    }
    OnBackSignal() {
        return this.resolveSuite();
    }
    resolveHotel() {
        return this.HotelResolver.Resolve()
            .then((flow) => {
            switch (flow.direction) {
                case FlowDirection_1.default.NEXT:
                    {
                        this.HotelResolved = flow.data;
                        this.SuiteResolver = new SelectSuite_1.default(this.HotelResolved);
                        return this.resolveSuite();
                    }
                    ;
                case FlowDirection_1.default.PREVIOUS:
                    {
                        return Promise.resolve(new TerminalFlow_1.default(FlowDirection_1.default.PREVIOUS));
                    }
                    ;
            }
            return Promise.reject("Unhandled flow");
        });
    }
    resolveSuite() {
        return this.SuiteResolver.Resolve()
            .then((flow) => {
            switch (flow.direction) {
                case FlowDirection_1.default.NEXT:
                    {
                        this.SuiteResolved = flow.data;
                        return Promise.resolve(new TerminalFlow_1.default(FlowDirection_1.default.NEXT, { hotel: this.HotelResolved, suite: this.SuiteResolved }));
                    }
                    ;
                case FlowDirection_1.default.PREVIOUS:
                    {
                        return this.resolveHotel();
                    }
                    ;
            }
            return Promise.reject("Unhandled flow");
        });
    }
}
exports.default = RecentlyChanged;
//# sourceMappingURL=RecentlyChanged.js.map