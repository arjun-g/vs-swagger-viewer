import * as vscode from "vscode";
import * as PreviewClient from "./preview/client";

export function activate(context: vscode.ExtensionContext): void {
  PreviewClient.activate(context);
}

export function deactivate(): void {
  PreviewClient.deactivate();
}
