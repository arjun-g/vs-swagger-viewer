import * as vscode from "vscode";
import * as YAML from "js-yaml";
import * as path from "path";
import * as fs from "fs";
import * as https from "https";
import * as http from "http";

import { PreviewServer } from "./server";

import * as SwaggerSchema from "../schemas/swagger.json";
import * as OpenAPISchema from "../schemas/openapi.json";

class InlinePreview implements vscode.TextDocumentContentProvider {
  uri?: vscode.Uri;
  disposable: vscode.Disposable | null = null;
  filename: string;

  onDidChange?: vscode.Event<vscode.Uri>;

  constructor(private previewUrl: string, filename: string) {
    this.filename = filename;
    const showOnlyFileName: boolean =
      !!vscode.workspace.getConfiguration("swaggerViewer").showOnlyFileName;
    const previewPanel = vscode.window.createWebviewPanel(
      "swaggerPreview",
      `Swagger Preview - ${
        showOnlyFileName ? path.basename(this.filename) : this.filename
      }`,
      vscode.ViewColumn.Two,
      {
        enableScripts: true,
        retainContextWhenHidden: true,
        localResourceRoots: [],
        enableCommandUris: true,
        enableFindWidget: true
      }
    );
    previewPanel.webview.html = this.provideTextDocumentContent();
  }

  provideTextDocumentContent(): string {
    const zoomLevel: number = vscode.workspace.getConfiguration("swaggerViewer").get("zoomLevel") || 100;
    const zoomStyle = `zoom: ${zoomLevel}%`;
    return `
			<!DOCTYPE html>
			<html>
				<head>
					<meta charset="UTF-8">
					<meta name="viewport" content="width=device-width, initial-scale=1.0">
				</head>
				<body style="margin:0px;padding:0px;overflow:hidden;${zoomStyle}">
					<div style="position:fixed;height:100%;width:100%;">
					<iframe src="${this.previewUrl}" frameborder="0" style="overflow:hidden;height:100%;width:100%" height="100%" width="100%"></iframe>
					</div>
				</body>
			</html>
		`;
  }
}

class BrowserPreview {
  constructor(private previewUrl: string, _filename: string) {
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

function getParsedContent(content: string, languageId: string): any {
  const fileContent = content;
  try {
    if (languageId === "json") {
      return JSON.parse(fileContent);
    } else if (languageId === "yaml") {
      return YAML.load(fileContent);
    } else if (languageId === "plaintext") {
      if (fileContent.match(/^\s*[{[]/)) {
        return JSON.parse(fileContent);
      } else {
        return YAML.load(fileContent);
      }
    }
  } catch (ex) {
    console.error("Error parsing content:", ex);
    return null;
  }
}

let previewServer: PreviewServer = new PreviewServer();
let statusBarItem: vscode.StatusBarItem | null = null;

// Tree view for Swagger files in workspace
class SwaggerTreeItem extends vscode.TreeItem {
  constructor(
    public readonly label: string,
    public readonly resourceUri: vscode.Uri,
    public readonly collapsibleState: vscode.TreeItemCollapsibleState
  ) {
    super(label, collapsibleState);
    this.tooltip = resourceUri.fsPath;
    this.command = {
      command: "swagger.preview",
      title: "Preview Swagger",
      arguments: [resourceUri]
    };
    this.contextValue = "swaggerFile";
  }
}

class SwaggerTreeDataProvider implements vscode.TreeDataProvider<SwaggerTreeItem> {
  private _onDidChangeTreeData: vscode.EventEmitter<SwaggerTreeItem | undefined | null | void> = new vscode.EventEmitter<SwaggerTreeItem | undefined | null | void>();
  readonly onDidChangeTreeData: vscode.Event<SwaggerTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

  refresh(): void {
    this._onDidChangeTreeData.fire();
  }

  getTreeItem(element: SwaggerTreeItem): vscode.TreeItem {
    return element;
  }

  async getChildren(_element?: SwaggerTreeItem): Promise<SwaggerTreeItem[]> {
    if (!vscode.workspace.workspaceFolders) {
      vscode.window.showInformationMessage("No workspace folder open");
      return [];
    }

    const swaggerFiles: SwaggerTreeItem[] = [];
    
    // Find all potential Swagger/OpenAPI files in workspace
    const files = await vscode.workspace.findFiles(
      "**/*.{json,yaml,yml}",
      "**/node_modules/**"
    );

    console.log(`Found ${files.length} potential Swagger/OpenAPI files`);

    for (const file of files) {
      try {
        const content = fs.readFileSync(file.fsPath, "utf8");
        const parsed = file.fsPath.endsWith('.json') 
          ? JSON.parse(content)
          : YAML.load(content);
        
        // Check if it's a Swagger/OpenAPI file
        if (parsed && (parsed.swagger === "2.0" || (parsed.openapi && parsed.openapi.match(/^3\.[01]\.\d/)))) {
          const relativePath = vscode.workspace.asRelativePath(file);
          console.log(`Adding Swagger file: ${relativePath}`);
          swaggerFiles.push(
            new SwaggerTreeItem(
              relativePath,
              file,
              vscode.TreeItemCollapsibleState.None
            )
          );
        }
      } catch (ex) {
        console.log(`Error parsing file ${file.fsPath}:`, ex);
      }
    }

    console.log(`Total Swagger files found: ${swaggerFiles.length}`);
    return swaggerFiles;
  }
}

// Function to fetch content from URL
async function fetchFromUrl(url: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const client = url.startsWith("https") ? https : http;
    client.get(url, (res) => {
      let data = "";
      res.on("data", (chunk) => {
        data += chunk;
      });
      res.on("end", () => {
        resolve(data);
      });
    }).on("error", (err) => {
      reject(err);
    });
  });
}

export async function activate(context: vscode.ExtensionContext): Promise<void> {
  const redhatExtension = vscode.extensions.getExtension("redhat.vscode-yaml");
  if (!redhatExtension) {
    console.warn("YAML extension not found - intellisense will not be available");
    // Continue without YAML extension - preview will still work
  } else {
    if (!redhatExtension.isActive) {
      await redhatExtension.activate();
    }
    try {
      redhatExtension.exports.registerContributor(
        "swaggerviewer",
        (uri: string) => {
          for (let document of vscode.workspace.textDocuments) {
            if (document.uri.toString() === uri) {
              const parsedYAML = YAML.load(document.getText()) as any;
              if (parsedYAML) {
                if (parsedYAML.swagger === "2.0") {
                  return "swaggerviewer:swagger";
                } else if (
                  parsedYAML.openapi &&
                  parsedYAML.openapi.match(/^3\.[01]\.\d(-.+)?$/)
                ) {
                  return "swaggerviewer:openapi";
                }
              }
            }
          }
          return null;
        },
        (uri: string) => {
          if (uri === "swaggerviewer:swagger") {
            return JSON.stringify(SwaggerSchema);
          } else if (uri === "swaggerviewer:openapi") {
            return JSON.stringify(OpenAPISchema);
          }
          return null;
        }
      );
    } catch (ex) {
      console.error("Error registering YAML contributor:", ex);
    }
  }

  let disposable = vscode.commands.registerCommand("swagger.preview", (uri) => {
    vscode.window.withProgress(
      {
        location: vscode.ProgressLocation.Notification,
        title: "Starting Swagger Preview",
      },
      async (progress) => {
        progress.report({ increment: 0 });
        await previewServer.initiateServer();
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
          if (!editor) {
            vscode.window.showErrorMessage("No active editor found. Please open a Swagger/OpenAPI file.");
            return;
          }
          let document = editor.document;
          fileName = document.fileName;
          fileContent = getParsedContent(
            document.getText(),
            document.languageId
          );
          if (!fileContent) {
            vscode.window.showErrorMessage("Failed to parse file. Please ensure it's a valid JSON or YAML file.");
            return;
          }
        }
        fileHash = hashString(fileName.toLowerCase());
        
        // Wait for server to be ready before updating
        await new Promise<void>((resolve) => {
          const intervalRef = setInterval(() => {
            if (previewServer.serverRunning) {
              clearInterval(intervalRef);
              resolve();
            }
          }, 100);
        });
        
        await previewServer.update(fileName, fileHash, fileContent);
        const previewInBrowser: boolean =
          !!vscode.workspace.getConfiguration("swaggerViewer").previewInBrowser;

        // Make the port available locally and get the full URI
        const previewUrl = await vscode.env.asExternalUri(
          vscode.Uri.parse(previewServer.getUrl(fileHash))
        );

        if (previewInBrowser) {
          new BrowserPreview(previewUrl.toString(), fileName);
        } else {
          let inlinePreview = new InlinePreview(
            previewUrl.toString(),
            fileName
          );
          if (inlinePreview.disposable) {
            context.subscriptions.push(inlinePreview.disposable);
          }
        }

        // Add status bar item
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
    );
  });
  vscode.workspace.onDidChangeTextDocument(
    (e: vscode.TextDocumentChangeEvent) => {
      const activeEditor = vscode.window.activeTextEditor;
      if (activeEditor && e.document === activeEditor.document) {
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
  
  // Register tree view for Swagger files
  const swaggerTreeDataProvider = new SwaggerTreeDataProvider();
  const treeView = vscode.window.createTreeView("swaggerFiles", {
    treeDataProvider: swaggerTreeDataProvider
  });
  context.subscriptions.push(treeView);
  
  // Refresh tree view when files change
  const workspaceWatcher = vscode.workspace.createFileSystemWatcher(
    "**/*.{json,yaml,yml}"
  );
  workspaceWatcher.onDidCreate(() => swaggerTreeDataProvider.refresh());
  workspaceWatcher.onDidDelete(() => swaggerTreeDataProvider.refresh());
  workspaceWatcher.onDidChange(() => swaggerTreeDataProvider.refresh());
  context.subscriptions.push(workspaceWatcher);
  
  // Register command to preview from URL
  const previewFromUrlCommand = vscode.commands.registerCommand(
    "swagger.previewFromUrl",
    async () => {
      const url = await vscode.window.showInputBox({
        prompt: "Enter the URL of the Swagger/OpenAPI file",
        placeHolder: "https://example.com/api/swagger.json",
        validateInput: (value) => {
          if (!value) {
            return "URL cannot be empty";
          }
          if (!value.startsWith("http://") && !value.startsWith("https://")) {
            return "URL must start with http:// or https://";
          }
          return null;
        }
      });

      if (!url) {
        return;
      }

      vscode.window.withProgress(
        {
          location: vscode.ProgressLocation.Notification,
          title: `Fetching Swagger from ${url}`,
        },
        async (progress) => {
          try {
            progress.report({ increment: 30 });
            const content = await fetchFromUrl(url);
            progress.report({ increment: 60 });

            await previewServer.initiateServer();
            
            // Determine if content is JSON or YAML
            let fileContent;
            const languageId = url.endsWith(".json") || content.trim().startsWith("{") 
              ? "json" 
              : "yaml";
            
            fileContent = getParsedContent(content, languageId);
            
            if (!fileContent) {
              vscode.window.showErrorMessage("Failed to parse content from URL. Please ensure it's a valid Swagger/OpenAPI file.");
              return;
            }

            const fileHash = hashString(url.toLowerCase());
            
            // Wait for server to be ready
            await new Promise<void>((resolve) => {
              const intervalRef = setInterval(() => {
                if (previewServer.serverRunning) {
                  clearInterval(intervalRef);
                  resolve();
                }
              }, 100);
            });
            
            await previewServer.update(url, fileHash, fileContent);
            
            const previewInBrowser: boolean =
              !!vscode.workspace.getConfiguration("swaggerViewer").previewInBrowser;

            const previewUrl = await vscode.env.asExternalUri(
              vscode.Uri.parse(previewServer.getUrl(fileHash))
            );

            if (previewInBrowser) {
              new BrowserPreview(previewUrl.toString(), url);
            } else {
              let inlinePreview = new InlinePreview(previewUrl.toString(), url);
              if (inlinePreview.disposable) {
                context.subscriptions.push(inlinePreview.disposable);
              }
            }

            // Add status bar item
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

            vscode.window.showInformationMessage(`Successfully loaded Swagger from ${url}`);
          } catch (error) {
            vscode.window.showErrorMessage(
              `Failed to fetch Swagger from URL: ${error instanceof Error ? error.message : String(error)}`
            );
          }
        }
      );
    }
  );
  context.subscriptions.push(previewFromUrlCommand);
  
  // Watch for file changes to support external refs hot reload
  const fileWatcher = vscode.workspace.createFileSystemWatcher(
    "**/*.{json,yaml,yml}"
  );
  
  fileWatcher.onDidChange((_uri) => {
    // Update all active previews when any swagger file changes
    const activeEditor = vscode.window.activeTextEditor;
    if (activeEditor) {
      const fileName = activeEditor.document.fileName;
      const fileHash = hashString(fileName.toLowerCase());
      const content = getParsedContent(
        activeEditor.document.getText(),
        activeEditor.document.languageId
      );
      if (content) {
        previewServer.update(fileName, fileHash, content);
      }
    }
  });
  
  context.subscriptions.push(fileWatcher);
  
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
