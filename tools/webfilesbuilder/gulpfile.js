var gulp = require('gulp');
var fs = require('fs');
var concat = require('gulp-concat');
var gzip = require('gulp-gzip');
var flatmap = require('gulp-flatmap');
var path = require('path');
var htmlmin = require('gulp-htmlmin');
var uglify = require('gulp-uglify');
var pump = require('pump');
const { doesNotMatch } = require('assert');
var debug = require('gulp-debug');

function esprfidjsminify(cb) {
  pump([
        gulp.src('../../src/websrc/js/esprfid.js'),
        uglify(),
        gulp.dest('../../src/websrc/gzipped/js/'),
    ],
    cb()
    );
}

function esprfidjsgz(cb) {
    gulp.src("../../src/websrc/gzipped/js/esprfid.js")
    .pipe(gzip({
        append: true
    })).pipe(gulp.dest('../../src/websrc/gzipped/js/'));
    cb();
}

function esprfidjsgzh(cb) {
    var source = "../../src/websrc/gzipped/js/" + "esprfid.js.gz";
    var destination = "../../src/webh/" + "esprfid.js.gz.h";
 
    var wstream = fs.createWriteStream(destination);
    wstream.on('error', function (err) {
        console.log(err);
    });
 
    var data = fs.readFileSync(source);
 
    wstream.write('#define esprfid_js_gz_len ' + data.length + '\n');
    wstream.write('const uint8_t esprfid_js_gz[] PROGMEM = {')
 
    for (i=0; i<data.length; i++) {
        if (i % 1000 == 0) wstream.write("\n");
        wstream.write('0x' + ('00' + data[i].toString(16)).slice(-2));
        if (i<data.length-1) wstream.write(',');
    }
 
    wstream.write('\n};')
    wstream.end();
    cb();
}

function scripts_concat(cb) {
    gulp.src(['../../src/websrc/3rdparty/js/jquery-1.12.4.min.js', '../../src/websrc/3rdparty/js/bootstrap-3.3.7.min.js', '../../src/websrc/3rdparty/js/footable-3.1.6.min.js'])
    .pipe(concat({
        path: 'required.js',
        stat: {
            mode: 0666
        }
    }))
    .pipe(gulp.dest('../../src/websrc/js/'))
    .pipe(gzip({
        append: true
    }))
    .pipe(gulp.dest('../../src/websrc/gzipped/js/'));
    cb();
}

function scripts_finish(cb) {
    var source = "../../src/websrc/gzipped/js/" + "required.js.gz";
    var destination = "../../src/webh/" + "required.js.gz.h";
 
    var wstream = fs.createWriteStream(destination);
    wstream.on('error', function (err) {
        console.log(err);
    });
 
    var data = fs.readFileSync(source);
 
    wstream.write('#define required_js_gz_len ' + data.length + '\n');
    wstream.write('const uint8_t required_js_gz[] PROGMEM = {')
 
    for (i=0; i<data.length; i++) {
        if (i % 1000 == 0) wstream.write("\n");
        wstream.write('0x' + ('00' + data[i].toString(16)).slice(-2));
        if (i<data.length-1) wstream.write(',');
    }
 
    wstream.write('\n};')
    wstream.end();
    cb();
}

function scripts(cb) {
    gulp.series(esprfidjsminify, esprfidjsgz, esprfidjsgzh, scripts_concat, scripts_finish);
    cb();
}

function styles_concat(cb) {
    gulp.src("../../src/websrc/3rdparty/css/**/*.css").on('error', function(error) { 
            cb(error); })
        .pipe(debug({minimal:false}))
        .pipe(concat({ path: 'required.css', stat: { mode: 0666 }})).on('error', function(error) { 
            cb(error); })
        .pipe(gulp.dest('../../src/websrc/css')).on('error', function(error) { 
            cb(error); })
        .pipe(gzip({ append: true })).on('error', function(error) { 
            cb(error); })
        .pipe(gulp.dest('../../src/websrc/gzipped/css'))
            .on('error', function(error) { 
                cb(error); })
            .on('end', function() { 
                cb(); });
        cb();
}

function styles_finish(cb) {
    var source = "../../src/websrc/gzipped/css/" + "required.css.gz";
    var destination = "../../src/webh/" + "required.css.gz.h";
 
    var wstream = fs.createWriteStream(destination);
    wstream.on('error', function (err) {
        console.log(err);
    });
 
    var data = fs.readFileSync(source);
 
    wstream.write('#define required_css_gz_len ' + data.length + '\n');
    wstream.write('const uint8_t required_css_gz[] PROGMEM = {')
 
    for (i=0; i<data.length; i++) {
        if (i % 1000 == 0) wstream.write("\n");
        wstream.write('0x' + ('00' + data[i].toString(16)).slice(-2));
        if (i<data.length-1) wstream.write(',');
    }
 
    wstream.write('\n};')
    wstream.end();
    cb();
}

function styles(cb) {
    gulp.series(styles_concat, styles_finish);
    cb();
}

gulp.task('styles', gulp.series(styles_concat, styles_finish));

function fontgz(cb) {
    gulp.src("../../src/websrc/3rdparty/fonts/*.*").on('error', function(error) { cb(error); })
        .pipe(debug())
        .pipe(gulp.dest("../../src/websrc/fonts/")).on('error', function(error) { cb(error); })
        .pipe(gzip({ append: true })).on('error', function(error) { cb(error); })
        .pipe(gulp.dest('../../src/websrc/gzipped/fonts/')).on('error', function(error) { cb(error); });
    cb();
}

function fonts_finish(cb) {
    gulp.src("../../src/websrc/gzipped/fonts/*.*").on('error', function(error) { cb(error); })
        .pipe(flatmap(function(stream, file) {
			var filename = path.basename(file.path);
            var wstream = fs.createWriteStream("../../src/webh/" + filename + ".h");
            wstream.on("error", function(err) {
                gutil.log(err);
            });
			var data = file.contents;
            wstream.write("#define " + filename.replace(/\.|-/g, "_") + "_len " + data.length + "\n");
            wstream.write("const uint8_t " + filename.replace(/\.|-/g, "_") + "[] PROGMEM = {")
            
            for (i = 0; i < data.length; i++) {
                if (i % 1000 == 0) wstream.write("\n");
                wstream.write('0x' + ('00' + data[i].toString(16)).slice(-2));
                if (i < data.length - 1) wstream.write(',');
            }

            wstream.write("\n};")
            wstream.end();
            cb();
            return stream;
        }))
        .on('error', function(error) { 
            cb(error); 
        })
        .on('end', function() { 
            cb(); 
        });
    cb();
}

function fonts(cb) {
    gulp.series(fontgz, fonts_finish);
    cb();
}

function htmlsprep(cb) {
    result = gulp.src('../../src/websrc/*.htm*').on('error', function(error) { cb(error); })
        .pipe(htmlmin({collapseWhitespace: true, minifyJS: true})).on('error', function(error) { cb(error); })
        .pipe(gzip({ append: true })).on('error', function(error) { cb(error); })
        .pipe(gulp.dest('../../src/websrc/gzipped/')).on('end', function() { cb(); });
}

function htmls_finish(cb) {
    gulp.src("../../src/websrc/gzipped/*.gz").on('error', function(error) { cb(error); })
        .pipe(flatmap(function(stream, file) {
            var filename = path.basename(file.path);
            var wstream = fs.createWriteStream("../../src/webh/" + filename + ".h");
            wstream.on("error", function(err) {
                gutil.log(err);
            });
            var data = file.contents;
            wstream.write("#define " + filename.replace(/\.|-/g, "_") + "_len " + data.length + "\n");
            wstream.write("const uint8_t " + filename.replace(/\.|-/g, "_") + "[] PROGMEM = {")
            
            for (i = 0; i < data.length; i++) {
                if (i % 1000 == 0) wstream.write("\n");
                wstream.write('0x' + ('00' + data[i].toString(16)).slice(-2));
                if (i < data.length - 1) wstream.write(',');
            }

            wstream.write("\n};")
            wstream.end();
            cb();
            return wstream;
        }))
        .on('error', function(error) { 
            cb(error); 
        })
        .on('end', function() { 
            cb(); 
        });
}

function htmls(cb) {
    gulp.series(htmlsprep, htmls_finish);
    cb();
}

// gulp.task('default', gulp.series(scripts, styles, fonts, htmls));
gulp.task('default', gulp.series(
    gulp.series(htmlsprep, htmls_finish),
    gulp.series(fontgz, fonts_finish),
    gulp.series(styles_concat, styles_finish),
    gulp.series(esprfidjsminify, esprfidjsgz, esprfidjsgzh, scripts_concat, scripts_finish)
    ));