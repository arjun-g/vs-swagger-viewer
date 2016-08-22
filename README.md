# Swagger Viewer
## Swagger Viewer lets you preview swagger files as you type in Visual Studio Code.

It works on swagger files in json and yaml format. Preview happens in real time as you type.

* Open the swagger file and press F1.
* Run the Command `Preview Swagger`.
* Either:
    1. Copy the URL shown in the message box. (Eg. [https://localhost:9000/](https://localhost:9000/))
        * Open in any latest browser and see your changes reflecting in real time as you type in the editor.
    2. Click on `Open` to open the preview in your default browser.


![Swagger Preview](https://arjunstatic.blob.core.windows.net/public/swagger_preview.gif)


### Credits
Swagger Viewer utilizes the following open source projects
* [Sawgger Editor](https://github.com/swagger-api/swagger-editor)
* [Express](https://github.com/expressjs/express)
* [socket.io](https://github.com/socketio/socket.io/)