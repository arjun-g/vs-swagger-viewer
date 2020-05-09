import * as PreviewClient from "./preview/client";

export function activate(context) {
  PreviewClient.activate(context);
}

export function deactivate() {
  PreviewClient.deactivate();
}
