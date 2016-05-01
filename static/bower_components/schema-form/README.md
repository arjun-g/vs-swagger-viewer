# Angular JSON Schema Form

[![Build Status](https://travis-ci.org/mohsen1/angular-json-schema-form.svg?branch=master)](https://travis-ci.org/mohsen1/angular-json-schema-form)

> Angular directive for making forms out of JSON Schema

This directive is using [JSON Editor](http://jeremydorn.com/json-editor/) internally to generate forms.

### [Live demo](http://azimi.me/angular-json-schema-form/demo/demo.html)

## How to use

* Install via bower

  ```
    bower install --save-dev schema-form
  ```
* Include `mohsen1.schema-form` in you app

  ```
    angular.module('myApp', ['mohsen1.schema-form'])
  ```
* Pass your JSON Schema to `json-schema-form` attribute directive on `<form>` element

  ```
    <form schema-form="{type: 'string'}" action="/" method="post">
      <button type="submit">Send</button>
    </form>
  ```

  You can also use `ng-model` with this directive.

  Note that `schema-form` will **`prepend`** generated form elements.

## Development

Install Gulp via npm if you don't have it

```shell
npm install -g gulp
```

### Available commands

* `gulp`: build and test the project
* `gulp build`: build the project and make new files in`dist`
* `gulp serve`: start a server to serve the demo page and launch a browser then watches for changes in `src` files to reload the page
* `gulp test`: run tests
* `gulp serve-test`: runs tests and keep test browser open for development. Watches for changes in source and test files to re-run the tests

## License
MIT
