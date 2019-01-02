var gulp = require('gulp');
var fs = require('fs');
var concat = require('gulp-concat');
var gzip = require('gulp-gzip');
var flatmap = require('gulp-flatmap');
var path = require('path');
var htmlmin = require('gulp-htmlmin');
var uglify = require('gulp-uglify');
var pump = require('pump');

gulp.task('esprfidjsminify', function (cb) {
  pump([
        gulp.src('../../src/websrc/js/esprfid.js'),
        uglify(),
        gulp.dest('../../src/websrc/gzipped/js/'),
    ],
    cb
    );
});

gulp.task("esprfidjsgz", ["esprfidjsminify"], function() {
    return gulp.src("../../src/websrc/gzipped/js/esprfid.js")
        .pipe(gzip({
            append: true
        }))
    .pipe(gulp.dest('../../src/websrc/gzipped/js/'));
});

gulp.task('esprfidjsgzh', ["esprfidjsgz"] , function() {
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
});



gulp.task("scripts", ["scripts-concat"], function() {

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
	
});

gulp.task('scripts-concat', ["esprfidjsgzh"], function() {
    return gulp.src(['../../src/websrc/3rdparty/js/jquery-1.12.4.min.js', '../../src/websrc/3rdparty/js/bootstrap-3.3.7.min.js', '../../src/websrc/3rdparty/js/footable-3.1.6.min.js'])
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
});



gulp.task('styles-concat', function() {
    return gulp.src(['../../src/websrc/3rdparty/css/bootstrap-3.3.7.min.css', '../../src/websrc/3rdparty/css/footable.bootstrap-3.1.6.min.css', '../../src/websrc/3rdparty/css/sidebar.css'])
        .pipe(concat({
            path: 'required.css',
            stat: {
                mode: 0666
            }
        }))
        .pipe(gulp.dest('../../src/websrc/css/'))
        .pipe(gzip({
            append: true
        }))
        .pipe(gulp.dest('../../src/websrc/gzipped/css/'));
});



gulp.task("styles", ["styles-concat"], function() {

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
	
});


gulp.task("fontgz", function() {
	return gulp.src("../../src/websrc/3rdparty/fonts/*.*")
	.pipe(gulp.dest("../../src/websrc/fonts/"))
        .pipe(gzip({
            append: true
        }))
    .pipe(gulp.dest('../../src/websrc/gzipped/fonts/'));
});

gulp.task("fonts", ["fontgz"], function() {
    return gulp.src("../../src/websrc/gzipped/fonts/*.*")
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

            return stream;
        }));
});

gulp.task('htmlsprep', function() {
    return gulp.src('../../src/websrc/*.htm*')
        .pipe(htmlmin({collapseWhitespace: true, minifyJS: true}))
        .pipe(gulp.dest('../../src/websrc/gzipped/'))
        .pipe(gzip({
            append: true
        }))
        .pipe(gulp.dest('../../src/websrc/gzipped/'));
});

gulp.task("htmlsgz", ["htmlsprep"], function() {
    return gulp.src("../../src/websrc/*.htm*")
        .pipe(gzip({
            append: true
        }))
    .pipe(gulp.dest('../../src/websrc/gzipped/'));
});

gulp.task("htmls", ["htmlsgz"], function() {
    return gulp.src("../../src/websrc/gzipped/*.gz")
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

            return stream;
        }));
});

gulp.task('default', ['scripts', 'styles', "fonts", "htmls"]);