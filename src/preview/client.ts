import * as vscode from 'vscode';
import * as YAML from 'yamljs';
import * as SwaggerParser from 'swagger-parser';

import { PreviewServer } from './server';

const SHOULD_OPEN_BROWSER: boolean = !!vscode.workspace.getConfiguration('swaggerViewer').previewInBrowser || false;

class InlinePreview implements vscode.TextDocumentContentProvider  {

	uri: vscode.Uri
	disposable: vscode.Disposable = null

	onDidChange?: vscode.Event<vscode.Uri>;

	constructor(private previewUrl: string, private filename: string){
		let fileHash = hashString(filename);
		this.uri = vscode.Uri.parse(`swagger-${fileHash}://preview`);
		this.disposable = vscode.workspace.registerTextDocumentContentProvider(`swagger-${fileHash}`, this);
		vscode.commands.executeCommand('vscode.previewHtml', this.uri, vscode.ViewColumn.Two, `Swagger Preview - ${this.filename}`)
		.then(_ => {
			vscode.window.showErrorMessage('PREVIEW DONE');
		}, reason => {
			vscode.window.showErrorMessage(reason);
		});
	}

	provideTextDocumentContent(): vscode.ProviderResult<string> {
		return `
			<html>
				<body style="margin:0px;padding:0px;overflow:hidden">
					<div style="position:fixed;height:100%;width:100%;">
					<iframe src="${this.previewUrl}" frameborder="0" style="overflow:hidden;height:100%;width:100%" height="100%" width="100%"></iframe>
					</div>
				</body>
			</html>
		`
	}

}

class BrowserPreview {

	constructor(private previewUrl: string, private filename: string){
		vscode.commands.executeCommand('vscode.open', vscode.Uri.parse(this.previewUrl));
	}

}

function hashString(str: string): string{
	let hash = 0;
	for (let i = 0; i < str.length; i++) {
		hash += Math.pow(str.charCodeAt(i) * 31, str.length - i);
		hash = hash & hash;
	}
	return hash.toString();
}

function getParsedContent(document: vscode.TextDocument){
	const fileContent = document.getText();
	console.log('LANGUAGE', document.languageId)
	if (document.languageId === "json") {
		return JSON.parse(fileContent);
	} else if (document.languageId === "yaml") {
		return YAML.parse(fileContent);
	} else if (document.languageId === "plaintext") {
		if (fileContent.match(/^\s*[{[]/)) {
			return JSON.parse(fileContent);
		} else {
			return YAML.parse(fileContent);
		}
	}
}

let previewServer: PreviewServer = null;

export function activate(context: vscode.ExtensionContext){
	previewServer = new PreviewServer();
	let disposable = vscode.commands.registerCommand('extension.previewSwagger', () => {
		let editor = vscode.window.activeTextEditor;
		if(!editor) return;
		let document = editor.document;
		let fileName = document.fileName;
		let fileHash = hashString(fileName.toLowerCase());
		let fileContent = getParsedContent(document);
		previewServer.update(fileHash, fileContent);
		if(SHOULD_OPEN_BROWSER){
			new BrowserPreview(previewServer.getUrl(fileHash), fileName);
		}
		else{
			let inlinePreview = new InlinePreview(previewServer.getUrl(fileHash), fileName);
			context.subscriptions.push(inlinePreview.disposable);
		}
	});
	vscode.workspace.onDidChangeTextDocument((e: vscode.TextDocumentChangeEvent) => {
		if (e.document === vscode.window.activeTextEditor.document) {
			let fileName = e.document.fileName;
			let fileHash = hashString(fileName.toLowerCase());
			previewServer.update(fileHash, getParsedContent(e.document));
		}
	});
	context.subscriptions.push(disposable);
}

export function deactivate(){
	if(previewServer) previewServer.stop();
}