import TerminalFlow from "./TerminalFlow";
import SabreHotel from "../../models/SabreHotel";
import SabreSuite from "../../models/SabreSuite";

export type HotelAndSuiteResolverResult = {hotel: SabreHotel, suite: SabreSuite};

export default abstract class HotelAndSuiteResolver {
    public abstract Resolve(): Promise<TerminalFlow<HotelAndSuiteResolverResult>>;

    public abstract OnBackSignal(): Promise<TerminalFlow<HotelAndSuiteResolverResult>>;
}