import { Application } from 'express';
import * as path from 'path';

import examplesRouter from './api/controllers/examples/router';

const publicdir: string = path.join(__dirname, 'public');
const root = path.normalize(__dirname + '/../..');

console.log(publicdir, root);

export default function routes(app: Application): void {
    app.use('/api/v1/examples', examplesRouter);
};