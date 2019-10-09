import * as path from 'path';
import * as fs from 'fs';
import * as vscode from 'vscode';
import * as express from 'express';
import * as http from 'http';
import * as socketio from 'socket.io';
import * as SwaggerParser from 'swagger-parser';

const SERVER_HOST = vscode.workspace.getConfiguration('swaggerViewer').defaultHost || 'localhost';

const SERVER_PORT = vscode.workspace.getConfiguration('swaggerViewer').defaultPort || 15870;

const FILE_CONTENT: { [key: string]: any } = {};

export class PreviewServer {

	currentHost: string = SERVER_HOST
	currentPort: number = SERVER_PORT
	io: socketio.Server
	server: http.Server

	constructor(){
		const app = express();
		app.use(express.static(path.join(__dirname, '..', '..', 'static')));
		app.use('/node_modules', express.static(path.join(__dirname, '..', '..', 'node_modules')));
		app.use('/:fileHash', (req, res) => {
			let htmlContent = fs.readFileSync(path.join(__dirname, '..', '..', 'static', 'index.html')).toString('utf-8').replace('%FILE_HASH%', req.params.fileHash);
			res.setHeader('Content-Type', 'text/html');
			res.send(htmlContent);
		});

		this.server = http.createServer(app);
		this.io = socketio(this.server);

		app.set('port', SERVER_PORT);

		this.startServer(this.currentPort);

		this.io.on('connection', (socket) => {
			socket.on("GET_INITIAL", function (data, fn) {
				let fileHash = data.fileHash;
				socket.join(fileHash);
				fn(FILE_CONTENT[fileHash]);
			});
		});
	}

	private startServer(port){
		this.currentPort = port;
		try{
			this.server
			.once('error', (e: any) => {
				if(e.code === 'EADDRINUSE'){
					this.startServer(this.currentPort + 1);
				}
			})
			.listen(this.currentPort, err => {
				if(err) this.startServer(this.currentPort + 1);
			});
		}
		catch(err){
			this.startServer(this.currentPort + 1);
		}
	}

	async update(filePath: string, fileHash:string, content: any){
		FILE_CONTENT[fileHash] = await SwaggerParser.bundle(filePath, content, {

		} as any);
		this.io.to(fileHash).emit('TEXT_UPDATE', content);
	}

	getUrl(fileHash: string): string {
		return `http://${this.currentHost}:${this.currentPort}/${fileHash}`;
	}

	stop(){
		this.server.close();
	}

}
