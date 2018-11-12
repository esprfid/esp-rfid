'use strict';

module.exports = function () {
  return {
    packages: [ 'gulp-concat', 'gulp-htmlmin', 'gulp-flatmap', 'gulp-gzip', 'gulp-uglify', 'fs', 'path', 'pump'],
    deployFiles: [ 'gulpfile.js' ],
    take: 'last-line'
  };
};