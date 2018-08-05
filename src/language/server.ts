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
	TextDocumentPositionParams
} from 'vscode-languageserver';
import * as SwaggerParser from 'swagger-parser';
import * as YAML from 'yamljs';

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
	try{
		if(fileContent.indexOf('swagger') >= 0 || fileContent.indexOf('openapi') >= 0){
			if (document.languageId === "json") {
				fileObject = JSON.parse(fileContent);
			} else if (document.languageId === "yaml" || document.languageId === "yml") {
				fileObject = YAML.parse(fileContent);
			}
		}
	}
	catch(err){
		let diagnostics: Diagnostic[] = [];
			let diagnostic: Diagnostic = {
				severity: DiagnosticSeverity.Warning,
				code: 0,
				message: err.message,
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
				source: "Swagger Viewer"
			};

			if (err.mark) {
				diagnostic.range.start = diagnostic.range.end = {
					line: err.mark.line,
					character: err.mark.column
				};
			}

			diagnostics.push(diagnostic);

			connection.sendDiagnostics({
				uri: document.uri,
				diagnostics
			});

			connection.sendRequest("validated", err);
	}
	if(fileObject && typeof fileObject === 'object' && (fileObject.hasOwnProperty('swagger') || fileObject.hasOwnProperty('openapi'))){
		return fileObject;
	}
	return null;
}

async function validateTextDocument(textDocument: TextDocument): Promise<void> {
	let swaggerObject = getParsedContent(textDocument);
	
	if(!swaggerObject) return;

	let obj = JSON.parse(textDocument.getText());
	SwaggerParser.validate(obj)
		.then(api => {
			let diagnostics: Diagnostic[] = [];
			connection.sendDiagnostics({
				uri: textDocument.uri,
				diagnostics
			});
			connection.sendRequest("validated", null);
		})
		.catch(err => {
			let diagnostics: Diagnostic[] = [];
			let diagnostic: Diagnostic = {
				severity: DiagnosticSeverity.Warning,
				code: 0,
				message: err.message,
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
				source: "Swagger Viewer"
			};

			if (err.mark) {
				diagnostic.range.start = diagnostic.range.end = {
					line: err.mark.line,
					character: err.mark.column
				};
			}

			diagnostics.push(diagnostic);

			connection.sendDiagnostics({
				uri: textDocument.uri,
				diagnostics
			});

			connection.sendRequest("validated", err);
		})

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