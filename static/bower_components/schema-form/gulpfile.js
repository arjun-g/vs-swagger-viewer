'use strict';

/* jshint node:true */
/* jshint browser:true */

var fs            = require('fs');
var del           = require('del');
var gulp          = require('gulp');
var connect       = require('gulp-connect');
var concat        = require('gulp-concat');
var jshint        = require('gulp-jshint');
var header        = require('gulp-header');
var rename        = require('gulp-rename');
var uglify        = require('gulp-uglify');
var minifyHtml    = require('gulp-minify-html');
var minifyCSS     = require('gulp-minify-css');
var templateCache = require('gulp-angular-templatecache');
var plumber       = require('gulp-plumber');
var openBrowser   = require('gulp-open');
var less          = require('gulp-less');
var order         = require('gulp-order');
var jscs          = require('gulp-jscs');
var runSequence   = require('run-sequence');
var es            = require('event-stream');
var karma         = require('karma').server;

/*
 * Configuration for distribution files including header banner and npm package
 * information
*/
var config = {
  pkg : JSON.parse(fs.readFileSync('./package.json')),
  banner:
    '/*!\n' +
    ' * <%= pkg.name %>\n' +
    ' * <%= pkg.homepage %>\n' +
    ' * Version: <%= pkg.version %> - <%= timestamp %>\n' +
    ' * License: <%= pkg.license %>\n' +
    ' */\n\n\n'
};

/*
 * Connect server task
*/
gulp.task('connect', function() {
  return connect.server({
    // root: '.',
    livereload: true
  });
});

/*
 * `html` task triggers connect reload on html file changes.
 * This task does NOT compile html files to JavaScipt
*/
gulp.task('html', function() {
  return gulp.src(['./demo/*.html', '.src/*.html'])
    .pipe(connect.reload());
});

/*
 * Watch each file category for changes and trigger tasks accordingly
*/
gulp.task('watch', function() {
  gulp.watch(['./demo/**/*.html'], ['build']);
  gulp.watch(['./src/*.less'], ['build']);
  gulp.watch(['./src/*.js', './**/*.html'], ['build']);
});

/*
 * CLean up `dist` folder before copying a new set of files to it
*/
gulp.task('clean', function(cb) {
  del(['./dist'], cb);
});

/*
 * Compiles scripts from across the project into distribution JavaScript files
*/
gulp.task('scripts', ['clean'], function() {

  // Compile templates into AngularJS modules
  function buildTemplates() {
    return gulp.src('src/**/*.html')
      .pipe(minifyHtml({
        empty: true,
        spare: true,
        quotes: true
      }))
      .pipe(templateCache({module: 'mohsen1.schema-form'}));
  }

  // Test source JavaScript files with JSCS and JSHint
  function buildDistJS() {
    return gulp.src('src/schema-form.js')
      .pipe(plumber({errorHandler: handleError}))
      .pipe(jshint())
      .pipe(jscs())
      .pipe(jshint.reporter('jshint-stylish'))
      .pipe(jshint.reporter('fail'));
  }

  // Compile all JavaScript files into one file for distribution
  return es.merge(buildDistJS(), buildTemplates())
    .pipe(plumber({errorHandler: handleError}))
    .pipe(order([
      'schema-form.js',
      'template.js'
    ]))
    .pipe(concat('schema-form.js'))
    .pipe(header(config.banner, {
      timestamp: (new Date()).toISOString(), pkg: config.pkg
    }))
    .pipe(gulp.dest('dist'))
    .pipe(rename({suffix: '.min.js'}))
    .pipe(uglify({preserveComments: 'some'}))
    .pipe(gulp.dest('./dist'))
    .pipe(connect.reload());
});

/*
 * Compile and minify less files
*/
gulp.task('styles', ['clean'], function() {

  return gulp.src('src/schema-form.less')
    .pipe(less())
    .pipe(header(config.banner, {
      timestamp: (new Date()).toISOString(), pkg: config.pkg
    }))
    .pipe(gulp.dest('dist'))
    .pipe(minifyCSS())
    .pipe(rename({suffix: '.min.css'}))
    .pipe(gulp.dest('dist'))
    .pipe(connect.reload());
});

/*
 * Open browser after connect server started
*/
gulp.task('open', function() {
  return gulp.src('./demo/demo.html')
  .pipe(openBrowser('', {url: 'http://localhost:8080/demo/demo.html'}));
});

/*
 * Enforce JSCS and JSHint to test files
*/
gulp.task('jshint-test', function() {
  return gulp.src('./test/**/*.js')
    .pipe(jshint())
    .pipe(jscs());
});

/*
 * Run unit tests
*/
gulp.task('karma', function(done) {
  karma.start({
    configFile: __dirname + '/karma.conf.js',
    singleRun: true
  }, done);
});

/*
 * Run unit test and keep tests open
*/
gulp.task('karma-serve', function(done) {
  karma.start({
    configFile: __dirname + '/karma.conf.js'
  }, done);
});

/*
 * Error handler
*/
function handleError(err) {
  /*jshint validthis:true */
  console.log(err);
  this.emit('end');
}

// Exposed tasks
gulp.task('build', ['scripts', 'styles']);
gulp.task('serve', function(cb) {
  runSequence('build', 'connect', 'watch', 'open', cb);
});
gulp.task('default', ['build', 'test']);
gulp.task('test', ['build', 'jshint-test', 'karma']);
gulp.task('serve-test', ['build', 'watch', 'jshint-test', 'karma-serve']);
