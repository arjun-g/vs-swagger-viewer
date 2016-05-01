# YAML Worker

[![Build Status](https://travis-ci.org/mohsen1/yaml-worker.svg)](https://travis-ci.org/mohsen1/yaml-worker)

> JS-YAML and YAML-JS wrapper with Worker API

#### Installation

Install using Bower or npm

```
npm install --save yaml-worker
```

```
bower install --save yaml-worker
```

#### Usage

Use `YAMLWorker`:

```js
var worker = new YAMLWorker('bower_components/yaml-worker/');

worker.load('yaml: true', function(error, result) {
  console.log(result); // {"yaml": true}
});
```

### Development

To run the test run

```
karma start --single-run=true
```

### License
MIT
