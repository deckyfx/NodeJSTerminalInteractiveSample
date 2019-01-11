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

        socket.on('vorpal', (msg) => {
            // run vorpal commands
            let command = _.find(Util.vorpal.commands, (cmd) => {
                return cmd._name == msg;
            });
            if (command) {                
                command._fn.apply(null, [[], () => {}]);
            } else {
                Util.vorpal.log(`Command ${msg} not found`);
            }
        });
    });
};