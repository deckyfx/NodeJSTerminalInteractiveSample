import { Application } from 'express';
import * as path from 'path';
import * as fs from 'fs';

import examplesRouter from './api/controllers/examples/router';

const publicdir: string = path.join(__dirname, 'public');
const root = path.normalize(__dirname + '/../..');

export default function routes(app: Application): void {
    app.use('/api/v1/examples', examplesRouter);
    
    app.get('/suitetreat', function(req, res){
        // don't include file extension (.hbs)
        res.render('pages/index', {
            layout: 'other',
            partials: {
                footerBlock: '../includes/footer',
                navigationBlock: '../includes/navigation'
            },
            hello: 'Hello Suiters'
        });
    });

    app.get('/template', function(req, res){
        // don't include file extension (.hbs)
        res.render('sample', {
            hello: 'Hello World'
        });
    });

    app.get('/socket', function(req, res){
        res.render('socket');
    });

    app.get('/socket.io-client', function(req, res){
        res.type('text/javascript; charset=utf-8');
        res.end(fs.readFileSync(path.join(
            path.dirname(require.resolve('socket.io-client')), 
            '..',
            'dist', 
            'socket.io.js')).toString());
    });
};