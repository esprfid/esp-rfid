var clean   = require('gulp-clean');
var filter  = require('gulp-filter');
var gulp    = require('gulp');
var mocha   = require('gulp-mocha');
var watch   = require('gulp-watch');
var jshint  = require('gulp-jshint');
var stylish = require('jshint-stylish');

var root = __dirname;

gulp.task('clean', function() {
  return gulp.src([
    'examples/*/tmp',
    'test/tmp'
  ]).pipe(clean());
});

gulp.task('lint', function() {
  return gulp.src([ 'index.js', 'test/test.js', 'lib/*.js' ])
    .pipe(jshint({ expr: true }))
    .pipe(jshint.reporter(stylish));
});

gulp.task('test', function() {
  // monkeys are fixing `cwd` for `gulp-mocha`
  // node lives in one process/scope/directory
  process.chdir(root);

  return gulp.src('test/test.js')
    .pipe(mocha({ reporter: 'spec', timeout: 1000 }))
});

gulp.task('watch', function() {
  watch({
    glob: [ 'index.js', 'lib/*.js' , 'test/test.js' ],
    read: false
  }, ['clean', 'lint', 'test'])
});

gulp.task('default', ['watch']);
