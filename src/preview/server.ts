import * as path from "path";
import * as fs from "fs";
import * as vscode from "vscode";
import express from "express";
import * as http from "http";
import * as socketio from "socket.io";
import * as SwaggerParser from "swagger-parser";
import { getPortPromise } from "portfinder";

const SERVER_PORT =
  vscode.workspace.getConfiguration("swaggerViewer").defaultPort || 18512;

const FILE_CONTENT: { [key: string]: any } = {};

export class PreviewServer {
  currentHost: string = "localhost";
  currentPort: number = SERVER_PORT;
  io!: socketio.Server;
  server!: http.Server;

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
    app.use("/:fileHash", (req: express.Request, res: express.Response) => {
      let htmlContent = fs
        .readFileSync(path.join(__dirname, "..", "..", "static", "index.html"))
        .toString("utf-8")
        .replace("%FILE_HASH%", req.params.fileHash);
      res.setHeader("Content-Type", "text/html");
      res.send(htmlContent);
    });

    this.server = http.createServer(app);
    this.io = new socketio.Server(this.server);

    app.set("host", this.currentHost);
    app.set("port", this.currentPort);

    this.startServer(this.currentPort);

    this.io.on("connection", (socket) => {
      socket.on("GET_INITIAL", function (data, fn) {
        let fileHash = data.fileHash;
        socket.join(fileHash);
        console.log("Client requesting initial content for hash:", fileHash, "Available:", !!FILE_CONTENT[fileHash]);
        fn(FILE_CONTENT[fileHash]);
      });
    });
  }

  private startServer(port: number): void {
    this.currentPort = port;
    this.server.listen(this.currentPort, this.currentHost, () => {
      this.serverRunning = true;
    });
  }

  async update(filePath: string, fileHash: string, content: any): Promise<void> {
    try {
      FILE_CONTENT[fileHash] = await (SwaggerParser as any).bundle(
        filePath,
        content,
        {}
      );
      console.log("Updated content for hash:", fileHash, "Content exists:", !!FILE_CONTENT[fileHash]);
      this.io && this.io.to(fileHash).emit("TEXT_UPDATE", FILE_CONTENT[fileHash]);
    } catch (err) {
      console.error("Error updating swagger content:", err);
      // If bundling fails, use the original content
      FILE_CONTENT[fileHash] = content;
      this.io && this.io.to(fileHash).emit("TEXT_UPDATE", content);
    }
  }

  getUrl(fileHash: string): string {
    return `http://${this.currentHost}:${this.currentPort}/${fileHash}`;
  }

  stop(): void {
    if (this.server) {
      this.server.close();
    }
    this.serverRunning = false;
  }
}
