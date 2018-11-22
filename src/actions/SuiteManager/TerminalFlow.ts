import FlowDirection from "./FlowDirection";

class TerminalFlow<T extends any> {
    public constructor(public direction: FlowDirection, public data?: T) {
    }
};
export default TerminalFlow;