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

function create_header_file(stream, file, cb) {
    var filename = path.basename(file.path);
    var destination = "../../src/webh/" + filename + ".h";

    var wstream = fs.createWriteStream(destination);
    wstream.on('error', function (err) {
        console.log(err);
    });
 
    var data = file.contents;
    var c_filename = filename.replace(/\.|-/g, "_");
    wstream.write('#define ' + c_filename + '_len ' + data.length + '\n');
    wstream.write('const uint8_t ' + c_filename + '[] PROGMEM = {')
     
    for (i=0; i<data.length; i++) {
        if (i % 1000 == 0) wstream.write("\n");
        wstream.write('0x' + ('00' + data[i].toString(16)).slice(-2));
        if (i<data.length-1) wstream.write(',');
    }
 
    wstream.write('\n};')
    wstream.end();

    cb();

    return wstream;
}

function esprfidjs(cb) {
    gulp.src('../../src/websrc/js/esprfid.js').on('error', function(error) { cb(error); })
        .pipe(uglify()).on('error', function(error) { cb(error); })
        .pipe(gzip({ append: true })).on('error', function(error) { cb(error); })
        .pipe(flatmap((stream, file) => create_header_file(stream, file, cb)))
        .on('error', function(error) { 
            cb(error); })
        .on('end', function() { 
            cb(); });

}

function scripts(cb) {
    gulp.src([
        '../../src/websrc/3rdparty/js/jquery-1.12.4.min.js', 
        '../../src/websrc/3rdparty/js/bootstrap-3.3.7.min.js', 
        '../../src/websrc/3rdparty/js/footable-3.1.6.min.js'
    ]).on('error', function(error) { cb(error); })
    .pipe(concat({ path: 'required.js', stat: { mode: 0666 }})).on('error', function(error) { cb(error); })
    .pipe(gzip({ append: true })).on('error', function(error) { cb(error); })
    .pipe(flatmap((stream, file) => create_header_file(stream, file, cb)))
    .on('error', function(error) { 
        cb(error); })
    .on('end', function() { 
        cb(); });

}

function styles(cb) {
    gulp.src([
        "../../src/websrc/3rdparty/css/bootstrap-3.3.7.min.css",
        "../../src/websrc/3rdparty/css/footable.bootstrap-3.1.6.min.css",
        "../../src/websrc/3rdparty/css/sidebar.css",
        ]).on('error', function(error) { cb(error); })
        .pipe(concat({ path: 'required.css', stat: { mode: 0666 }})).on('error', function(error) { 
            cb(error); })
        .pipe(gzip({ append: true })).on('error', function(error) { 
            cb(error); })
        .pipe(flatmap((stream, file) => create_header_file(stream, file, cb)))
        .on('error', function(error) { 
            cb(error); })
        .on('end', function() { 
            cb(); });
}

function fontgz(cb) {
    gulp.src("../../src/websrc/3rdparty/fonts/*").on('error', function(error) { cb(error); })
    .pipe(debug())
    .pipe(gzip({ append: true })).on('error', function(error) { cb(error); })
        .pipe(flatmap((stream, file) => create_header_file(stream, file, cb))).on('error', function(error) { 
            cb(error); 
        })
        .on('end', function() { 
            cb(); 
        });}

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
}

gulp.task('default', gulp.series(
    gulp.series(htmlsprep, htmls_finish),
    fontgz,
    styles,
    esprfidjs,
    scripts
    ));