import { Application } from 'express';
import * as socketio from "socket.io";
import * as path from 'path';
import Util from '../../../Util';
import _ = require('lodash');
import { Exception } from 'winston';

const publicdir: string = path.join(__dirname, 'public');
const root = path.normalize(__dirname + '/../..');

export default function socketroutes(app: Application): void {
    let io:socketio.Server = app.get("io") as socketio.Server;

    io.on('connection', (socket) => {

        console.log('a user connected');
        Util.ToggleSocketModeOn(socket);

        socket.on('disconnect', () => {
            console.log('user disconnected');
            Util.ToggleSocketModeOff();
        });

        Util.vorpal.log(`Run features with ${Util.printValue("socket.emit(\"vorpal\", \"[COMMAND]\")")}`);
        Util.vorpal.log(`Answer prompt question with ${Util.printValue("socket.emit(\"prompt.answer\", \"[INDEX]\")")}`);

        socket.on('vorpal', (msg) => {
            // run vorpal commands
            let help_command = _.find(Util.vorpal.commands, (cmd) => {
                return cmd._name == "help";
            });
            let found_comand;
            if (msg) {
                found_comand = _.find(Util.vorpal.commands, (cmd) => {
                    return cmd._name == msg;
                });
            }
            if (!found_comand || !msg) {
                Util.vorpal.log(`"${msg}" is a Invalid Command. Showing Help:`);
                found_comand = help_command;
                let vorpallog = (data: any) => {
                    socket!.emit('vorpal.log', data);
                }
                found_comand.log = vorpallog;
            }      
            try {
                found_comand._fn.apply(found_comand, [[], () => {}]);
            } catch (e) {
                socket!.emit('error', e);
            }
        });
    });
};