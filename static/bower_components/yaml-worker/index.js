
function YAMLWorker(basePath) {
  var workerPath = 'worker.js';

  if (basePath) {
    workerPath = basePath + workerPath;
  }

  this.worker = new Worker(workerPath);
  this.queue = [];
  this.worker.onmessage = this.onmessage.bind(this);
  this.worker.onerror = this.onerror.bind(this);
  this.buffer = new Map();
}

[
  'load',
  'loadAll',
  'safeLoad',
  'safeLoadAll',
  'dump',
  'safeDump',
  'scan',
  'parse',
  'compose',
  'compose_all',
  'load_all',
  'emit',
  'serialize',
  'serialize_all',
  'dump_all'
].forEach(function (method) {
  YAMLWorker.prototype[method] = function (arg, cb) {
    this.queue.push({
      method: method,
      arg: arg,
      cb: cb
    });
    this.enqueue();
  };
});

YAMLWorker.prototype.enqueue = function() {

  // if queue is empty do nothing.
  if (!this.queue.length) {
    this.currentTask = null;
    return;
  }

  // if there is a currentTask do nothing
  if (this.currentTask) {
    return;
  }

  this.currentTask = this.queue.shift();

  var task = [this.currentTask.method, this.currentTask.arg];
  var taskString = JSON.stringify(task);

  if (this.buffer.has(taskString)) {

    if (this.buffer.get(taskString).error) {
      this.currentTask.cb(this.buffer.get(taskString).error);
    } else {
      this.currentTask.cb(null, this.buffer.get(taskString).result);
    }

    this.currentTask = null;
    this.enqueue();
    return;
  }

  this.worker.postMessage(task);
};

YAMLWorker.prototype.onmessage = function(message) {
  var task = [this.currentTask.method, this.currentTask.arg];
  var taskString = JSON.stringify(task);

  if (message.data.error) {
    this.buffer.set(taskString, {error: message.data.error});
    this.currentTask.cb(message.data.error);
  } else {
    this.buffer.set(taskString, {result: message.data.result});
    this.currentTask.cb(null, message.data.result);
  }
  this.currentTask = null;
  this.enqueue();
};

YAMLWorker.prototype.onerror = function(error) {
  this.currentTask.cb(error);
  this.currentTask = null;
  this.enqueue();
};

if (typeof module !== 'undefined') {
  module.exports = YAMLWorker;
}