const io = require("socket.io-client");

import PortCity from "../../../models/PortCity";
import SabreCity from "../../../models/SabreCity";
import SabreHotel from "../../../models/SabreHotel";
import SabreImage from "../../../models/SabreImage";
import SabreSuite from "../../../models/SabreSuite";
import Task from "../../../models/Task";
import { InquirerAnswerBase, 
    InquirerConfirmAnswer, 
    InquirerIndexedAnswer, 
    InquirerInputAnswer,
    InquirerSelectChangeLogAnswer,
    InquirerSelectCityAnswer,
    InquirerSelectHotelAnswer,
    InquirerSelectMongoCityAnswer,
    InquirerSelectSabreImageAnswer,
    InquirerSelectSuiteByItsDescriptionAnswer,
    InquirerSelectTaskAnswer,
    InquirerSelectSuiteAnswer } from "../../../repositories/hotelrepository/InquirerAnswer";

export class SocketClient {

    private static instance: SocketClient;

    public socket: SocketIOClient.Socket;
    private _commands: Array<string> = [];

    static getInstance() {
        if (!SocketClient.instance) {
            SocketClient.instance = new SocketClient();
            // ... any one time initialization goes here ...
        }
        return SocketClient.instance;
    }

    public constructor() {
        this.socket = io('http://localhost:3000');

        this.socket.on('connect', () => {
            this.connected();

            this.socket.removeListener('vorpal.commands');
            this.socket.removeListener('vorpal.done');
            this.socket.removeListener('vorpal.log');
            this.socket.removeListener('spinner');
            this.socket.removeListener('opn');
            this.socket.removeListener('prompt');
            this.socket.removeListener('prompt.message');
            this.socket.removeListener('prompt.answer');
            this.socket.removeListener('disconnect');
            this.socket.removeListener('error');
            
            // this.socket.emit('chat message', 'Hello');    
            this.socket.on('vorpal.log', (msg: string) => {
                this.log(msg);
            });
            this.socket.on('vorpal.commands', (commands: Array<string>) => {
                this.commands(commands);
            });
            this.socket.on('vorpal.done', () => {
                this.commandDone();
            });
            this.socket.on('spinner', (flag: boolean) => {
                this.spinner(flag);
            });
            this.socket.on('opn', (url: string) => {
                this.opn(url);
            });
            this.socket.on('prompt', (data: string) => {
                this.prompt(JSON.parse(data));
            });
            this.socket.on('prompt.message', (msg: string) => {
                this.promptMessage(msg);
            });
            this.socket.on('prompt.answer', (data: string) => {
                this.promptAnswered(JSON.parse(data));
            });
            this.socket.on('error', (e: Error) => {
                this.error(e);
            });
        });
        
        this.socket.on('disconnect', (reason: any) => {
            this.disconnected(reason);
            if (reason === 'io server disconnect') {
                // the disconnection was initiated by the server, you need to reconnect manually
                this.socket.removeListener('vorpal.commands');
                this.socket.removeListener('vorpal.done');
                this.socket.removeListener('vorpal.log');
                this.socket.removeListener('spinner');
                this.socket.removeListener('opn');
                this.socket.removeListener('prompt');
                this.socket.removeListener('prompt.message');
                this.socket.removeListener('prompt.answer');
                this.socket.removeListener('disconnect');
                this.socket.removeListener('error');
        
                this.socket.connect();
            }
            // else the socket will automatically try to reconnect
        });
        
        this.socket.on('connect_error', (e: Error) => {
            console.log('connect_error', e);
        });
        
        this.socket.on('connect_timeout', () => {
            console.log('connect_timeout',);
        });
        
        this.socket.on('reconnect', (attemptNumber: number) => {
            console.log('reconnect', attemptNumber);
        });
        
        this.socket.on('reconnect_attempt', (attemptNumber: number) => {
            console.log('reconnect_attempt', attemptNumber);
        });
        
        this.socket.on('reconnecting', (attemptNumber: number) => {
            console.log('reconnecting', attemptNumber);
        });
        
        this.socket.on('reconnect_error', (e: Error) => {
            console.log('reconnect_error', e);
        });
        
        this.socket.on('reconnect_failed', () => {
            console.log('reconnect_failed');
        });
        
        this.socket.on('ping', () => {
            console.log('ping');
        });
        
        this.socket.on('pong', () => {
            console.log('pong');
        });
    }

    public getCommands(): void {
        this.socket.emit("vorpal.commands");
    }

    public runCommand(command: string, argv?: string): void {
        this.socket.emit("vorpal", `${command} ${argv}`);
    }

    public answerPrompt(answer: any): void {
        this.socket.emit("prompt.answer", answer);
    }

    private connected(): void {
    }

    private disconnected(reason: any): void {
    }

    private log(msg: string): void {
        // receive log
    }

    private commands(commands: Array<string>): void {
        this._commands = commands;
    }

    private commandDone(): void {
    }

    private spinner(flag: boolean): void {
    }

    private opn(url: string): void {
    }

    private prompt(data: any): void {
    }

    private promptMessage(msg: string): void {
    }

    private promptAnswered(data: any): void {
    }

    private error(e: Error): void {
        console.warn(e);
    }
}

export default SocketClient.getInstance(); 
(window as any).Client = SocketClient.getInstance();