export default abstract class ActionBase {    
    public constructor(public next: Function, public args?: any) {
        
    }

    protected abstract run(): number;
}