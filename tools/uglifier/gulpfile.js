var gulp = require('gulp');
var concat = require('gulp-concat');
var gzip = require('gulp-gzip');

gulp.task('scripts', function() {
  return gulp.src(['../../datasrc/js/jquery-1.12.4.min.js', '../../datasrc/js/bootstrap-3.3.7.min.js', '../../datasrc/js/footable-3.1.6.min.js', '../../datasrc/js/nprogress-0.2.0.js'])
    .pipe(concat({ path: 'required.js', stat: { mode: 0666 }}))
	.pipe(gulp.dest('../../data/'))
	.pipe(gzip({ append: true }))
    .pipe(gulp.dest('../../data/'));
});

gulp.task('styles', function() {
  return gulp.src(['../../datasrc/css/bootstrap-3.3.7.min.css', '../../datasrc/css/footable.bootstrap-3.1.6.min.css', '../../datasrc/css/nprogress-0.2.0.css'])
    .pipe(concat({ path: 'required.css', stat: { mode: 0666 }}))
	.pipe(gulp.dest('../../data/'))
	.pipe(gzip({ append: true }))
    .pipe(gulp.dest('../../data/'));
});

gulp.task('default', ['scripts', 'styles']);
