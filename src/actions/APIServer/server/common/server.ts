import * as express from 'express';
import { Application } from 'express';
import * as path from 'path';
import * as bodyParser from 'body-parser';
import * as http from 'http';
import * as os from 'os';
import * as cookieParser from 'cookie-parser';
import Util from '../../../../Util';

const app = express();

export default class ExpressServer {
    constructor() {
    const root = path.normalize(__dirname + '/../..');
        app.set('appPath', root + 'client');
        app.use(bodyParser.json({ limit: process.env.REQUEST_LIMIT || '100kb' }));
        app.use(bodyParser.urlencoded({ extended: true, limit: process.env.REQUEST_LIMIT || '100kb' }));
        app.use(cookieParser(process.env.SESSION_SECRET));
        app.use(express.static(`${root}/public`));
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
