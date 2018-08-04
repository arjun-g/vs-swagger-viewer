import * as PreviewClient from './preview/client';
import * as LanguageClient from './language/client';

export function activate(context) {
	PreviewClient.activate(context);
	LanguageClient.activate(context);
}

export function deactivate(){
	PreviewClient.deactivate();
	LanguageClient.deactivate();
}