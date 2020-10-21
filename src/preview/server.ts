import * as path from "path";
import * as fs from "fs";
import * as vscode from "vscode";
import * as express from "express";
import * as http from "http";
import * as socketio from "socket.io";
import * as SwaggerParser from "swagger-parser";
import * as request from "request";
import { getPortPromise } from "portfinder";

const SERVER_PORT =
  vscode.workspace.getConfiguration("swaggerViewer").defaultPort || 18512;

const FILE_CONTENT: { [key: string]: any } = {};

export class PreviewServer {
  currentHost: string = null;
  currentPort: number = SERVER_PORT;
  io: socketio.Server;
  server: http.Server;

  serverRunning: boolean = false;

  constructor() {}

  public async initiateServer() {
    if (this.serverRunning) return;
    this.currentHost =
      vscode.workspace.getConfiguration("swaggerViewer").defaultHost ||
      "localhost";
    this.currentPort = await getPortPromise({ port: this.currentPort });
    const app = express();
    app.use(express.static(path.join(__dirname, "..", "..", "static")));
    app.use(
      "/node_modules",
      express.static(path.join(__dirname, "..", "..", "node_modules"))
    );
    app.use('/proxy', (req, res) => {
      res.header("Access-Control-Allow-Origin", "*");
      request(req.query.url).pipe(res);
    });
    app.use("/:fileHash", (req, res) => {
      let htmlContent = fs
        .readFileSync(path.join(__dirname, "..", "..", "static", "index.html"))
        .toString("utf-8")
        .replace("%FILE_HASH%", req.params.fileHash);
      res.setHeader("Content-Type", "text/html");
      res.send(htmlContent);
    });

    this.server = http.createServer(app);
    this.io = socketio(this.server);

    app.set("host", this.currentHost);
    app.set("port", this.currentPort);

    this.startServer(this.currentPort);

    this.io.on("connection", (socket) => {
      socket.on("GET_INITIAL", function (data, fn) {
        let fileHash = data.fileHash;
        socket.join(fileHash);
        fn(FILE_CONTENT[fileHash]);
      });
    });
  }

  private startServer(port) {
    this.currentPort = port;
    this.server.listen(this.currentPort, this.currentHost , () => {
      this.serverRunning = true;
    });
  }

  async update(filePath: string, fileHash: string, content: any) {
    try {
      FILE_CONTENT[fileHash] = await SwaggerParser.bundle(
        filePath,
        content,
        {} as any
      );
      this.io && this.io.to(fileHash).emit("TEXT_UPDATE", content);
    } catch (err) {
      
    }
  }

  getUrl(fileHash: string): string {
    return `http://${this.currentHost}:${this.currentPort}/${fileHash}`;
  }

  stop() {
    this.server.close();
    this.server = null;
    this.serverRunning = false;
  }
}
