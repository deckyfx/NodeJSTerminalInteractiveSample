import * as socketio from "socket.io";
import { Separator } from "inquirer";
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
    InquirerSelectSuiteAnswer, } from "../repositories/hotelrepository/InquirerAnswer";
import PortCity from "../models/PortCity";
import SabreCity from "../models/SabreCity";
import SabreHotel from "../models/SabreHotel";
import SabreImage from "../models/SabreImage";
import SabreSuite from "../models/SabreSuite";
import Task from "../models/Task";
import _ = require("lodash");
import Util from "../Util";
import { isNumber, isBoolean, isString } from "util";

export type PromptConfig = {};
export class SocketHandler {
    private static instance: SocketHandler;
    private static socket: socketio.Socket;

    static getInstance() {
        if (!SocketHandler.instance) {
            SocketHandler.instance = new SocketHandler();
        }
        return SocketHandler.instance;
    }

    public constructor() {
    }

    public setSocket(socket: socketio.Socket) {
        SocketHandler.socket = socket;
    }
    
    public vorpallog(data: any): void {
        if (SocketHandler.socket) {
            SocketHandler.socket!.emit('vorpal.log', data);
        }
    }
    
    public spinnerstart(): void {
        if (SocketHandler.socket) {
            SocketHandler.socket.emit('spinner', true);
        }
    }
    
    public spinnerstop(data: any): void {
        if (SocketHandler.socket) {
            SocketHandler.socket.emit('spinner', false);
        }
    }
    
    public opn(data: any): void {
        if (SocketHandler.socket) {
            SocketHandler.socket.emit('opn', data);
        }
    }
    
    public prompt<T extends InquirerAnswerBase<any>>(config: {
        type?: string,
        message?: string,
        name?: string,
        pageSize?: number,
        default?: number,
        choices?: Array<T | any>
        [key: string]: any
    }): Promise<T> {
        if (!SocketHandler.socket) {
            return Promise.reject(new Error("Invalid prompt result"));
        }
        const TEMP_CHOICES = config.choices;

        config.choices = _.map(config.choices, (choice) => {
            if (choice instanceof Separator) {
            } else {
                if (isNumber(choice.value) || isBoolean(choice.value) || isString(choice.value)) {
                } else {
                    choice.value = "[Non Native Instance]";
                }
            }
            return choice;
        });
        SocketHandler.socket.emit('prompt.message', config.message); 
        SocketHandler.socket.emit('prompt', JSON.stringify(config));
        return new Promise<T>((resolve, reject) => {
            // should wait for input
            switch (config.type) {
                case "list":
                case "checkbox-plus": {
                    SocketHandler.socket.on('prompt.answer', (answer_idx: number) => {
                        let answer = TEMP_CHOICES![answer_idx];
                        SocketHandler.socket.emit(`prompt.answer`, JSON.stringify(answer));
                        if (answer instanceof Separator) {
                        } else {
                            resolve(answer);
                        }
                    });
                } break;

                case "input": {
                    SocketHandler.socket.on('prompt.answer', (answer_data: string) => {
                        SocketHandler.socket.emit(`prompt.answer`, answer_data);
                        resolve(new InquirerInputAnswer(answer_data) as any);
                    });
                } break;

                case "confirm": {
                    SocketHandler.socket.on('prompt.answer', (answer_data: boolean) => {
                        SocketHandler.socket.emit(`prompt.answer`, answer_data);
                        resolve(new InquirerConfirmAnswer(answer_data) as any);
                    });
                } break;
            }
        });
    }
}