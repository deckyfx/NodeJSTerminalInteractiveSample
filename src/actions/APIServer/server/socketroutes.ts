import { Application } from 'express';
import * as socketio from "socket.io";
import * as path from 'path';
import Util from '../../../Util';
import _ = require('lodash');

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

        Util.vorpal.log(`Get available commands with ${Util.printValue("socket.emit(\"vorpal.commands\")")}`);
        Util.vorpal.log(`Run vorpal command with ${Util.printValue("socket.emit(\"vorpal\", \"[COMMAND]\")")}`);
        Util.vorpal.log(`Answer prompt question with ${Util.printValue("socket.emit(\"prompt.answer\", \"[INDEX]\")")}`);
        socket.on('vorpal', (msg?: string) => {
            // run vorpal commands
            var commandData = Util.vorpal.util.parseCommand(msg, Util.vorpal.commands);
            let help_command = _.find(Util.vorpal.commands, (cmd) => {
                return cmd._name == "help";
            });
            let args = Util.vorpal.util.buildCommandArgs(commandData.matchArgs, commandData.match, {
                command: msg,
                args: {},
                callback: () => {},
                session: null
            }, true);
            if (!msg) {
                msg = "help";
            }
            msg = msg.trim();
            if (!commandData.match) {
                Util.vorpal.log(`"${msg}" is a Invalid Command. Showing Help:`);
                commandData.match = help_command;
            }
            try {
                let vorpallog = (data: any) => {
                    socket!.emit('vorpal.log', data);
                }
                commandData.match.log = vorpallog;

                commandData.match._fn.apply(commandData.match, [args, () => {
                    socket!.emit('vorpal.done');
                }]);
            } catch (e) {
                socket!.emit('error', e);
            }
        });
        socket.on('vorpal.commands', () => {
            let available_commands: Array<string> = _.map(Util.vorpal.commands, (cmd) => {
                return cmd._name;
            })
            socket!.emit('vorpal.commands', JSON.stringify(available_commands));
        });
    });
};