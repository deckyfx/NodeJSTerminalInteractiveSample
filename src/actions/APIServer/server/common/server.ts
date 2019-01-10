import * as express from 'express';
import { Application } from 'express';
import * as path from 'path';
import * as bodyParser from 'body-parser';
import * as cookieParser from 'cookie-parser';
import * as serveIndex from 'serve-index';
import * as http from 'http';
import * as os from 'os';
import * as consolidate from "consolidate";
import * as handlebars from "handlebars";

import Util from '../../../../Util';

const app = express();

export default class ExpressServer {
    constructor() {
        const root = path.normalize(__dirname + '/..');
        app.set('appPath', root + 'client');
        app.use(bodyParser.json({ limit: process.env.REQUEST_LIMIT || '100kb' }));
        app.use(bodyParser.urlencoded({ extended: true, limit: process.env.REQUEST_LIMIT || '100kb' }));
        app.use(cookieParser(process.env.SESSION_SECRET));

        app.use(express.static(`${path.join(root, 'public')}`), 
                    serveIndex(`${path.join(root, 'public')}`, {'icons': true}));

        app.use('/public',  express.static(`${path.join(root, 'public')}`), 
                                serveIndex(`${path.join(root, 'public')}`, {'icons': true}));

        app.use('/js',      express.static(`${path.join(root, 'public', 'js')}`), 
                                serveIndex(`${path.join(root, 'public', 'js')}`, {'icons': true}));

        app.use('/css',     express.static(`${path.join(root, 'public', 'css')}`), 
                                serveIndex(`${path.join(root, 'public', 'css')}`, {'icons': true}));

        app.use("/image",   express.static(`${path.join(root, 'public', 'image')}`), 
                                serveIndex(`${path.join(root, 'public', 'image')}`, {'icons': true}));

        app.engine('hbs', consolidate.handlebars);        
        app.set('view engine', 'hbs');
        app.set('views', `${path.join(root, 'views')}`);
    }

    router(routes: (app: Application) => void): ExpressServer {
        routes(app);
        return this;
    }

    listen(p: string | number = 3000): Application {
        const welcome = (port: string | number) => () => Util.vorpal.log(`Server ready on port ${port}`);
        http.createServer(app).listen(p, welcome(p));
        return app;
    }
}
