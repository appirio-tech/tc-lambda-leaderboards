var gulp = require('gulp');
require('tc-lambda-gulp-tasks')(gulp);

var runSequence = require('run-sequence');

gulp.task('test', function(cb) {
  var lc = require('./lambda-config.js')
  console.log(lc);
  return cb
})

gulp.task('deploy', function(callback) {
  return runSequence(
    ['clean'], ['js', 'node-mods'],
    // ADD ANY FILE YOU WANT TO THE dist/ folder
    ['zip'], ['upload'],
    callback
  );
});
