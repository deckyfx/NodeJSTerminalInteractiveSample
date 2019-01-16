import { Application } from 'express';
import * as path from 'path';
import * as fs from 'fs';

import examplesRouter from './api/controllers/examples/router';

const publicdir: string = path.join(__dirname, 'public');
const root = path.normalize(__dirname + '/../..');

export default function routes(app: Application): void {
    app.use('/api/v1/examples', examplesRouter);
    
    app.get('/suitetreat', (req, res) => {
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

    app.get('/template', (req, res) => {
        // don't include file extension (.hbs)
        res.render('sample', {
            hello: 'Hello World'
        });
    });

    app.get('/socket', (req, res) => {
        res.render('socket');
    });

    app.get('/socket.io-client', (req, res) => {
        res.type('text/javascript; charset=utf-8');
        res.end(fs.readFileSync(path.join(
            path.dirname(require.resolve('socket.io-client')), 
            '..',
            'dist', 
            'socket.io.js')).toString());
    });

    app.get('/load-models', (req, res) => {
        res.type('text/javascript; charset=utf-8');
        const modelpath = path.normalize(__dirname + '/../../../models');
        fs.readdir(modelpath, (err, filenames) => {
            if (err) {
                console.log(err);
            } else {
                filenames.forEach((filename) => {
                    let filepath = path.join(modelpath, filename);
                    let fileext = path.extname(filepath);
                    if (fileext == ".js") {
                        res.write("// -------------------------------------------------\n");
                        res.write(`// ${path.basename(filepath)} ` + "\n");
                        res.write("// -------------------------------------------------\n");                         
                        res.write(fs.readFileSync(filepath).toString());
                        res.write("\n\n");
                    }
                });
                res.end();
            }
        });
    });
};