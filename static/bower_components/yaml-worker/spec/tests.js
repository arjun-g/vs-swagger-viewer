'use strict';

/* jshint mocha: true */
/* globals expect, YAMLWorker */
var worker;

describe('Basic YAMLWroker methods', function () {

  before(function () {
    worker = new YAMLWorker('../');
  });

  it('#load', function (done) {
    worker.load('val: 1', function (err, result) {
      expect(err).to.be.null;
      expect(result).to.deep.equal({val: 1});
      done();
    });
  });

  it('#compose', function (done) {
    worker.compose('val: 1', function (err, result) {
      expect(err).to.be.null;
      expect(result).to.have.property('tag');
      expect(result).to.have.property('value');
      done();
    });
  });

  it('#dump', function (done) {
    worker.dump({val:1}, function (err, result) {
      expect(err).to.be.null;
      expect(result).to.equal('val: 1\n');
      done();
    });
  });
});

describe('Errors', function () {
  var worker;

  before(function () {
    worker = new YAMLWorker();
  });

  it('calls the callback with an error for invalid YAML', function (done) {
    var invalidYaml = 'value: 1\n val: 2'; // bad indentation
    var yamlError = { // copied from jsyaml error thrown
      "name": "YAMLException",
      "reason": "bad indentation of a mapping entry",
      "mark": {
        "name": null,
        "buffer": "value: 1\n val: 2\n\u0000",
        "position": 13,
        "line": 1,
        "column": 4
      },
      "message": "bad indentation of a mapping entry at line 2, column 5:\n     val: 2\n        ^"
    };

    worker.load(invalidYaml, function (error) {
      expect(error.name).to.equal(yamlError.name);
      expect(error.reason).to.equal(yamlError.reason);
      expect(error.mark).to.deep.equal(yamlError.mark);
      expect(error.message).to.equal(yamlError.message);
      done();
    });
  });
});

describe('Stress testing', function () {
  var worker;

  before(function () {
    worker = new YAMLWorker();
  });

  describe('performs 3 async load operations', function () {
    var str1 = 'val1: 1\nval2: 2\nhash:\n  a: b\n  c: d';
    var str2 = 'val1: 3\nval2: 4\nhash:\n  e: f\n  g: h';
    var obj1 = {val1: 1, val2: 2, hash: {a: 'b', c: 'd'}};
    var obj2 = {val1: 3, val2: 4, hash: {e: 'f', g: 'h'}};
    var str3 = 'me: 1';
    var obj3 = {me: 1};

    it('load 1', function (done){
      worker.load(str1, function (err, res) {
        expect(err).to.be.null;
        expect(res).to.deep.equal(obj1);
        done();
      });
    });
    it('load 2', function (done){
      worker.load(str2, function (err, res) {
        expect(err).to.be.null;
        expect(res).to.deep.equal(obj2);
        done();
      });
    });
    it('load 3', function (done){
      worker.load(str3, function (err, res) {
        expect(err).to.be.null;
        expect(res).to.deep.equal(obj3);
        done();
      });
    });
  });
});

describe('Stress testing errors', function () {
  var worker;

  before(function () {
    worker = new YAMLWorker();
  });

  describe('performs 3 async load operations', function () {
    var invalidYaml1 = 'value: 1\n val: 2'; // bad indentation
    var invalidYaml2 = 'val: 1\n val: 2'; // bad indentation
    var invalidYaml3 = 'val: 3\n v: 2'; // bad indentation

    it('load 1', function(done){
      worker.load(invalidYaml1, function (err, res) {
        var referror = {
          "name": "YAMLException",
          "reason": "bad indentation of a mapping entry",
          "mark": {
            "name": null,
            "buffer": "value: 1\n val: 2\n\u0000",
            "position": 13,
            "line": 1,
            "column": 4
          },
          "message": "bad indentation of a mapping entry at line 2, column 5:\n     val: 2\n        ^"
        };

        expect(err.mark).to.deep.equal(referror.mark);
        expect(err.name).to.equal(referror.name);
        expect(err.reason).to.equal(referror.reason);
        expect(err.message).to.equal(referror.message);
        expect(res).to.equal.null;
        done();
      });
    });

    it('load 2', function(done){
      worker.load(invalidYaml2, function (err, res) {
        var referror = {
          "name": "YAMLException",
          "reason": "bad indentation of a mapping entry",
          "mark": {
            "name": null,
            "buffer": "val: 1\n val: 2\n\u0000",
            "position": 11,
            "line": 1,
            "column": 4
          },
          "message": "bad indentation of a mapping entry at line 2, column 5:\n     val: 2\n        ^"
        };

        expect(err.mark).to.deep.equal(referror.mark);
        expect(err.name).to.equal(referror.name);
        expect(err.reason).to.equal(referror.reason);
        expect(err.message).to.equal(referror.message);
        expect(res).to.equal.null;
        done();
      });
    });

    it('load 3', function(done){
      worker.load(invalidYaml3, function (err, res) {
        var referror = {
          "name": "YAMLException",
          "reason": "bad indentation of a mapping entry",
          "mark": {
            "name": null,
            "buffer": "val: 3\n v: 2\n\u0000",
            "position": 9,
            "line": 1,
            "column": 2
          },
          "message": "bad indentation of a mapping entry at line 2, column 3:\n     v: 2\n      ^"
        };

        expect(err.mark).to.deep.equal(referror.mark);
        expect(err.name).to.equal(referror.name);
        expect(err.reason).to.equal(referror.reason);
        expect(err.message).to.equal(referror.message);
        expect(res).to.equal.null;
        done();
      });
    });
  });
});
