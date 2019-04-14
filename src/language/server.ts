import * as vscode from 'vscode';
import {
	createConnection,
	TextDocuments,
	TextDocument,
	Diagnostic,
	DiagnosticSeverity,
	ProposedFeatures,
	InitializeParams,
	DidChangeConfigurationNotification,
	CompletionItem,
	CompletionItemKind,
	TextDocumentPositionParams,
	Files
} from 'vscode-languageserver';
import * as SwaggerParser from 'swagger-parser';
import * as YAML from 'js-yaml';
import * as path from 'path';

const SWAGGER_CODE_COMPLTE_DEFS = [
    /** TODO */
]

let connection = createConnection(ProposedFeatures.all);

let documents: TextDocuments = new TextDocuments();

let hasConfigurationCapability: boolean = false;
let hasWorkspaceFolderCapability: boolean = false;
let hasDiagnosticRelatedInformationCapability: boolean = false;

connection.onInitialize((params: InitializeParams) => {
	let capabilities = params.capabilities;

	hasConfigurationCapability =
		capabilities.workspace && !!capabilities.workspace.configuration;
	hasWorkspaceFolderCapability =
		capabilities.workspace && !!capabilities.workspace.workspaceFolders;
	hasDiagnosticRelatedInformationCapability =
		capabilities.textDocument &&
		capabilities.textDocument.publishDiagnostics &&
		capabilities.textDocument.publishDiagnostics.relatedInformation;

	return {
		capabilities: {
			textDocumentSync: documents.syncKind,
			completionProvider: {
				resolveProvider: true,
				triggerCharacters: ['"', ':']
			}
		}
	};
});

connection.onInitialized(() => {
	if (hasConfigurationCapability) {
		connection.client.register(
			DidChangeConfigurationNotification.type,
			undefined
		);
	}
	if (hasWorkspaceFolderCapability) {
		connection.workspace.onDidChangeWorkspaceFolders(_event => {
			connection.console.log('Workspace folder change event received.');
		});
	}
});

interface ExampleSettings {
	maxNumberOfProblems: number;
}

const defaultSettings: ExampleSettings = { maxNumberOfProblems: 1000 };
let globalSettings: ExampleSettings = defaultSettings;

let documentSettings: Map<string, Thenable<ExampleSettings>> = new Map();

connection.onDidChangeConfiguration(change => {
	if (hasConfigurationCapability) {
		documentSettings.clear();
	} else {
		globalSettings = <ExampleSettings>(
			(change.settings.languageServerExample || defaultSettings)
		);
	}

	documents.all().forEach(validateTextDocument);
});

function getDocumentSettings(resource: string): Thenable<ExampleSettings> {
	if (!hasConfigurationCapability) {
		return Promise.resolve(globalSettings);
	}
	let result = documentSettings.get(resource);
	if (!result) {
		result = connection.workspace.getConfiguration({
			scopeUri: resource,
			section: 'swaggerViewer'
		});
		documentSettings.set(resource, result);
	}
	return result;
}

documents.onDidClose(e => {
	documentSettings.delete(e.document.uri);
});

documents.onDidChangeContent(change => {
	validateTextDocument(change.document);
});

function getParsedContent(document: TextDocument){
	let fileContent = document.getText();
	let fileObject: Object = null;
	if(fileContent.indexOf('swagger') >= 0 || fileContent.indexOf('openapi') >= 0){
		if (document.languageId === "json") {
			fileObject = JSON.parse(fileContent);
		} else if (document.languageId === "yaml" || document.languageId === "yml") {
			fileObject = YAML.safeLoad(fileContent);// YAML.safeLoad(fileContent);
		}
	}
	if(fileObject && typeof fileObject === 'object' && (fileObject.hasOwnProperty('swagger') || fileObject.hasOwnProperty('openapi'))){
		return fileObject;
	}
	return null;
}

function sendErrorDiagnostic(error: any, textDocument: TextDocument, source: string){
	let diagnostics: Diagnostic[] = [];
	let diagnostic: Diagnostic = {
		severity: DiagnosticSeverity.Warning,
		code: 0,
		message: error.message,
		range: {
			start: {
				line: 0,
				character: 1
			},
			end: {
				line: 0,
				character: 1
			}
		},
		source: source
	};

	if (error.mark) {
		diagnostic.range.start = diagnostic.range.end = {
			line: error.mark.line,
			character: error.mark.column
		};
	}

	diagnostics.push(diagnostic);

	connection.sendDiagnostics({
		uri: textDocument.uri,
		diagnostics
	});
}

function validateSwagger(swagger: any, textDocument: TextDocument) {
	SwaggerParser.validate(swagger)
	.then(() => {
		const diagnostics: Diagnostic[] = [];
		connection.sendDiagnostics({
			uri: textDocument.uri,
			diagnostics
		});
	})
	.catch(error => {
		sendErrorDiagnostic(error, textDocument, "Swagger Viewer");
	});
}

function changeCurrentWorkDir(textDocument: TextDocument): void {
	const documentPath = Files.uriToFilePath(textDocument.uri);
	const documentDir = path.dirname(documentPath);
	// work dir == document base dir
	process.chdir(documentDir);
}

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	let swaggerObject = null;
	try{
		swaggerObject = getParsedContent(textDocument);
	}
	catch(ex){
		sendErrorDiagnostic(ex, textDocument, "Swagger Viewer Parse");
	}
	
	if(!swaggerObject) return;

	changeCurrentWorkDir(textDocument);

	validateSwagger(swaggerObject, textDocument);
}

connection.onDidChangeWatchedFiles(_change => {
	
});

connection.onCompletion(
	(_textDocumentPosition: TextDocumentPositionParams): CompletionItem[] => {
		return SWAGGER_CODE_COMPLTE_DEFS;
	}
);

connection.onCompletionResolve(
	(item: CompletionItem): CompletionItem => {
		let def = SWAGGER_CODE_COMPLTE_DEFS.find(def => def.data.id === item.data.id);
		item.detail = def.detail;
		item.documentation = def.documentation;
		return item;
	}
);

documents.listen(connection);

connection.listen();