import * as express from 'express';
import * as bodyParser from "body-parser";
import { Request, Response } from "express";
import Util from './Util';

export class Server {
    private static instance: Server;

    private app: express.Application = express();
    private port: number = 10000;
    private routes: Routes = new Routes();

    static getInstance() {
        if (!Server.instance) {
            Server.instance = new Server();
        }
        return Server.instance;
    }

    public constructor() {
        this.app = express();
        this.port = 10000;
        
        // support application/json type post data
        this.app.use(bodyParser.json());

        //support application/x-www-form-urlencoded post data
        this.app.use(bodyParser.urlencoded({ extended: false }));

        this.app = this.routes.routes(this.app);
    }
    
    public serve(port: number = 10000): void {                
        this.app.listen(this.port, () => {
            Util.vorpal.log(`Serving http at port: ${this.port}`);
        })
    }
}

export class Routes {    
    public routes(app: express.Application): express.Application {

        app.route('/add-queue')
        .post((req: Request, res: Response) => {            
            res.status(200).send({
                message: 'GET request successfulll!!!!'
            })
        })

        app.route('/add-now') 
        .post((req: Request, res: Response) => {   
            // Create new contact         
            res.status(200).send({
                message: 'POST request successfulll!!!!'
            })
        })

        return app;
    }
}

export default Server.getInstance(); // do something with the instance...