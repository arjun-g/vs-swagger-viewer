// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
var vscode = require('vscode');
var path = require('path');

var ports = {}
    , servers = {}
    , ios = {}
    ;

class Viewer {
    constructor(context) {
        this.context = context;
        this.uri = vscode.Uri.parse('swagger://preview');
        this.Emmittor = new vscode.EventEmitter();
        this.onDidChange = this.Emmittor.event;
    }

    provideTextDocumentContent(uri, token) {
        return `
        <html>
            <body style="margin:0px;padding:0px;overflow:hidden">
                <div style="position:fixed;height:100%;width:100%;">
                <iframe src="http://localhost:9000" frameborder="0" style="overflow:hidden;height:100%;width:100%" height="100%" width="100%"></iframe>
                </div>
            </body>
        </html>
        `;
    }

    display() {
        var editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        return vscode.commands.executeCommand('vscode.previewHtml', this.uri, vscode.ViewColumn.Two, 'Swagger Preview')
            .then(success => {
                vscode.window.showTextDocument(editor.document);
                return;
            }, reason => {
                vscode.window.showErrorMessage(reason);
            });
    }

    register() {
        var ds = [];
        var disposable = vscode.workspace.registerTextDocumentContentProvider('swagger', this);
        ds.push(disposable);
        return ds;
    }
    upate() {
        this.Emmittor.fire(this.uri);
    }
};

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
function activate(context) {
  
    var viewer = new Viewer(context);
    var ds = viewer.register();
    // Use the console to output diagnostic information (console.log) and errors (console.error)
    // This line of code will only be executed once when your extension is activated
    
    // The command has been defined in the package.json file
    // Now provide the implementation of the command with  registerCommand
    // The commandId parameter must match the command field in package.json
    var disposable = vscode.commands.registerCommand('extension.previewSwagger', function () {
        var openBrowser = vscode.workspace.getConfiguration('swaggerViewer').previewInBrowser || false;
        var defaultPort = vscode.workspace.getConfiguration('swaggerViewer').defaultPort || 9000;
        let handlePreviewResponse = (option) => {
            if (typeof option == 'undefined') {
                return;
            }
            if (option.action == "open") {
                let uri = vscode.Uri.parse(option.url);
                vscode.commands.executeCommand('vscode.open', uri);
            }
        };

        var editor = vscode.window.activeTextEditor;
        if (!editor) {
            return;
        }
        var doc = editor.document;
        var fileName = doc.fileName.toLowerCase();
        if (!servers[fileName]) {
            // Display a message box to the user
            //vscode.window.showInformationMessage('Hello World!');
            var express = require('express');
            var http = require('http');
            var app = express();
            app.use(express.static(path.join(__dirname, 'static')));
            //app.set('port', 3002);
            var server = http.createServer(app);
            var io = require('socket.io')(server);
            function startServer(port) {
                app.set('port', port);
                try {
                    server.listen(port, function (err) {
                        servers[fileName] = server;
                        ports[fileName] = port;
                        ios[fileName] = io;
                        if (openBrowser) {
                        vscode.window.showInformationMessage('Preview "' + fileName.substring((fileName.lastIndexOf("\\") || fileName.lastIndexOf("/")) + 1) + '" in http://localhost:' + port + "/",
                            {
                                title: 'Open',
                                action: 'open',
                                url: 'http://localhost:' + port + '/'
                            }).then(handlePreviewResponse);
                        } else {
                            viewer.display();
                        }
                        //console.log('Example app listening on port 3000!');
                        ios[fileName].on("connection", function (socket) {
                            socket.on("GET_UPDATE", function (data, fn) {
                                fn(doc.getText());
                            })
                        })
                        var previewSwagger = new PreviewSwagger(fileName);
                        var previewSwaggerController = new PreviewSwaggerController(previewSwagger);
                        context.subscriptions.push(previewSwagger);
                        context.subscriptions.push(previewSwaggerController);
                        previewSwagger.update();
                        viewer.upate();
                    });
                    server.on("error", function (err) {
                        startServer(++port);
                    })
                }
                catch (ex) {
                    startServer(++port);
                }
            }
            startServer(defaultPort);
        }
        else{
            if (openBrowser) {
            vscode.window.showInformationMessage('Preview "' + fileName.substring((fileName.lastIndexOf("\\") || fileName.lastIndexOf("/")) + 1) + '" in http://localhost:' + ports[fileName] + "/",
                {
                    title: 'Open',
                    action: 'open',
                    url: 'http://localhost:' + ports[fileName] + '/'
                }).then(handlePreviewResponse);
            } else {
                viewer.display();
            }
        }
    });
    context.subscriptions.push(disposable);
    context.subscriptions.push(...ds);
}

function PreviewSwagger(fileName) {
    var editor = vscode.window.activeTextEditor;
    var doc = editor.document;
    this.update = function () {
        ios[fileName].emit("TEXT_UPDATE", doc.getText());
    }
    this.close = function () {
        servers[fileName].close();
        console.log("CLOSED");
    }
}

function PreviewSwaggerController(swag) {
    var subscriptions = [];
    function update() {
        var editor = vscode.window.activeTextEditor;
        if (!editor) { return; }
        var doc = editor.document;
        if (doc.languageId === "yaml") {
            swag.update();
        } else {
            swag.close();
        }
    }
    vscode.window.onDidChangeActiveTextEditor(update, this, subscriptions);
    vscode.window.onDidChangeTextEditorSelection(update, this, subscriptions);
    swag.update();
}

exports.activate = activate;



// this method is called when your extension is deactivated
function deactivate() {
}
exports.deactivate = deactivate;