# Swagger Viewer
## Swagger Viewer lets you preview swagger files as you type in Visual Studio Code.

It works on swagger files in json and yaml format. Preview happens in real time as you type.

To  start
* Open the swagger file and press F1.
* Run the Command `Preview Swagger`.

OR
* Press  `Shift + Alt + P`

THEN
* Either:
    1. Copy the URL shown in the message box. (Eg. [https://localhost:9000/](https://localhost:9000/))
        * Open in any latest browser and see your changes reflecting in real time as you type in the editor.
    2. Click on `Open` to open the preview in your default browser.


![Swagger Preview](https://arjunstatic.blob.core.windows.net/public/swagger_preview_launch.gif)

## Change Default Port

Default port of the preview url can be changed by changing the `swaggerViewer.defaultPort` value in `User/Workspace Settings`

![Swagger Preview Settings](https://arjunstatic.blob.core.windows.net/public/swagger_preview_settings.gif)

v1.2.0 Changes

* Added `Open` button in message box. (By [@pmentz](https://github.com/pmentz) [https://github.com/arjun-g/vs-swagger-viewer/pull/3](https://github.com/arjun-g/vs-swagger-viewer/pull/3)
* Added shortcut `Shift + Alt + P` to run the command
* Ability to change default port from `User/Workspace Settings`.

### Credits
Swagger Viewer utilizes the following open source projects
* [Swagger Editor](https://github.com/swagger-api/swagger-editor)
* [Express](https://github.com/expressjs/express)
* [socket.io](https://github.com/socketio/socket.io/)