import { Application } from 'express';
import * as path from 'path';

import examplesRouter from './api/controllers/examples/router';

const publicdir: string = path.join(__dirname, 'public');

export default function routes(app: Application): void {
    app.use('/api/v1/examples', examplesRouter);

    app.get('/', function (req, res) {
        res.sendFile(path.join(publicdir, 'index.html'));
    })
};