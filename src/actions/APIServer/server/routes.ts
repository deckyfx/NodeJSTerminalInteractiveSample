import { Application } from 'express';
import * as path from 'path';

import examplesRouter from './api/controllers/examples/router';

const publicdir: string = path.join(__dirname, 'public');
const root = path.normalize(__dirname + '/../..');

export default function routes(app: Application): void {
    app.use('/api/v1/examples', examplesRouter);

    app.get('/template', function(req, res){
        // don't include file extension (.hbs)
        res.render('sample', {
            hello: 'Hello World'
        });
    });
};