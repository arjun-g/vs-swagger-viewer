import * as vscode from "vscode";
import * as YAML from "js-yaml";
import * as path from "path";
import * as fs from "fs";

import { PreviewServer } from "./server";

import * as SwaggerSchema from "../schemas/swagger.json";
import * as OpenAPISchema from "../schemas/openapi.json";

class InlinePreview implements vscode.TextDocumentContentProvider {
  uri: vscode.Uri;
  disposable: vscode.Disposable = null;

  onDidChange?: vscode.Event<vscode.Uri>;

  constructor(private previewUrl: string, private filename: string) {
    const showOnlyFileName: boolean = !!vscode.workspace.getConfiguration(
      "swaggerViewer"
    ).showOnlyFileName;
    const previewPanel = vscode.window.createWebviewPanel(
      "swaggerPreview",
      `Swagger Preview - ${
        showOnlyFileName ? path.basename(this.filename) : this.filename
      }`,
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
      }
    );
    previewPanel.webview.html = this.provideTextDocumentContent();
  }

  provideTextDocumentContent(): string {
    return `
			<html>
				<body style="margin:0px;padding:0px;overflow:hidden">
					<div style="position:fixed;height:100%;width:100%;">
					<iframe src="${this.previewUrl}" frameborder="0" style="overflow:hidden;height:100%;width:100%" height="100%" width="100%"></iframe>
					</div>
				</body>
			</html>
		`;
  }
}

class BrowserPreview {
  constructor(private previewUrl: string, private filename: string) {
    vscode.commands.executeCommand(
      "vscode.open",
      vscode.Uri.parse(this.previewUrl)
    );
  }
}

function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash += Math.pow(str.charCodeAt(i) * 31, str.length - i);
    hash = hash & hash;
  }
  return hash.toString();
}

function getParsedContent(content: string, languageId) {
  const fileContent = content;
  try {
    if (languageId === "json") {
      return JSON.parse(fileContent);
    } else if (languageId === "yaml") {
      return YAML.safeLoad(fileContent);
    } else if (languageId === "plaintext") {
      if (fileContent.match(/^\s*[{[]/)) {
        return JSON.parse(fileContent);
      } else {
        return YAML.safeLoad(fileContent);
      }
    }
  } catch (ex) {
    return null;
  }
}

let previewServer: PreviewServer = new PreviewServer();
let statusBarItem: vscode.StatusBarItem = null;

export async function activate(context: vscode.ExtensionContext) {
  const redhatExtension = vscode.extensions.getExtension("redhat.vscode-yaml");
  if (!redhatExtension.isActive) {
    await redhatExtension.activate();
  }
  try {
    redhatExtension.exports.registerContributor(
      "swaggerviewer",
      (uri) => {
        console.log("PARSING URI", uri);
        for (let document of vscode.workspace.textDocuments) {
          if (document.uri.toString() === uri) {
            const parsedYAML = YAML.safeLoad(document.getText());
            if (parsedYAML) {
              if (parsedYAML.swagger === "2.0") {
                return "swaggerviewer:swagger";
              } else if (
                parsedYAML.openapi &&
                parsedYAML.openapi.match(/^3\.0\.\d(-.+)?$/)
              ) {
                return "swaggerviewer:openapi";
              }
            }
          }
        }
        return null;
      },
      (uri) => {
        if (uri === "swaggerviewer:swagger") {
          return JSON.stringify(SwaggerSchema);
        } else if (uri === "swaggerviewer:openapi") {
          return JSON.stringify(OpenAPISchema);
        }
        return null;
      }
    );
  } catch (ex) {}

  let disposable = vscode.commands.registerCommand("swagger.preview", (uri) => {
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Starting Swagger Preview",
      },
      async (progress, token) => {
        progress.report({ increment: 0 });
        previewServer.initiateServer();
        let fileContent = "",
          fileName = "",
          fileHash = null;
        if (uri) {
          let filePath = uri.fsPath;
          let languageId = path.extname(filePath) === "json" ? "json" : "yaml";
          fileName = filePath;
          fileContent = getParsedContent(
            fs.readFileSync(filePath).toString(),
            languageId
          );
        } else {
          let editor = vscode.window.activeTextEditor;
          if (!editor) return;
          let document = editor.document;
          fileName = document.fileName;
          fileContent = getParsedContent(
            document.getText(),
            document.languageId
          );
        }
        fileHash = hashString(fileName.toLowerCase());
        previewServer.update(fileName, fileHash, fileContent);
        const previewInBrowser: boolean = !!vscode.workspace.getConfiguration(
          "swaggerViewer"
        ).previewInBrowser;
        if (previewInBrowser) {
          new BrowserPreview(previewServer.getUrl(fileHash), fileName);
        } else {
          let inlinePreview = new InlinePreview(
            previewServer.getUrl(fileHash),
            fileName
          );
          context.subscriptions.push(inlinePreview.disposable);
        }

        return new Promise((resolve) => {
          const intervalRef = setInterval(() => {
            if (previewServer.serverRunning) {
              clearInterval(intervalRef);
              resolve();
              if (!statusBarItem) {
                statusBarItem = vscode.window.createStatusBarItem(
                  vscode.StatusBarAlignment.Right,
                  10
                );
                statusBarItem.command = "swagger.stop";
                statusBarItem.text = "Swagger Viewer";
                statusBarItem.tooltip = "Stop Swagger Preview Server";
                statusBarItem.show();
                context.subscriptions.push(statusBarItem);
              }
            }
          }, 100);
        });
      }
    );
  });
  vscode.workspace.onDidChangeTextDocument(
    (e: vscode.TextDocumentChangeEvent) => {
      if (e.document === vscode.window.activeTextEditor.document) {
        let fileName = e.document.fileName;
        let fileHash = hashString(fileName.toLowerCase());
        previewServer.update(
          fileName,
          fileHash,
          getParsedContent(e.document.getText(), e.document.languageId)
        );
      }
    }
  );
  context.subscriptions.push(disposable);
  context.subscriptions.push(
    vscode.commands.registerCommand("swagger.stop", () => {
      previewServer.stop();
      if (statusBarItem) {
        statusBarItem.hide();
        statusBarItem.dispose();
        statusBarItem = null;
      }
    })
  );
}

export function deactivate() {
  if (previewServer) previewServer.stop();
}
