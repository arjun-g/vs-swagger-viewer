# Swagger Viewer
## Swagger Viewer lets you preview swagger files as you type in Visual Studio Code.

It works on swagger files in json and yaml format. Preview happens in real time as you type.

To  start
* Open the swagger file and press F1.
* Run the Command `Preview Swagger`.

OR
* Press  `Shift + Alt + P`

THEN

* Preview It in the editor Itself like this

![Swagger Preview](https://arjunstatic.blob.core.windows.net:443/public/swagger_preview_inside.gif)

## Opening In External browser

If you want to preview the changes in external browser change the settings `swaggerViewer.previewInBrowser` to `true`

![Swagger Preview](https://arjunstatic.blob.core.windows.net:443/public/swagger_preview_settings_in_browser.png)

THEN

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

v1.3.0 Changes

* Now preview swagger inside the editor itself. (By [@ferreus](https://github.com/ferreus) [https://github.com/arjun-g/vs-swagger-viewer/pull/7](https://github.com/arjun-g/vs-swagger-viewer/pull/7)
* Preview iside editor by default

### Credits
Swagger Viewer utilizes the following open source projects
* [Swagger Editor](https://github.com/swagger-api/swagger-editor)
* [Express](https://github.com/expressjs/express)
* [socket.io](https://github.com/socketio/socket.io/)

### Contributors
* [Patrick Mentz (@pmentz)](https://github.com/pmentz)
* [Vladimir Vainer (@ferreus)](https://github.com/ferreus)