let path = require('path');
let gulp = require('gulp'),
    nodemon = require('gulp-nodemon');

gulp.task("watch",function() {
    nodemon({
        verbose: true,
        script: "./bin/www",
        ext: "js",
        watch: "./",
        env: {
            'DEBUG': 'hehz-read-backend:*',
            'NODE_ENV': 'development'
        },
        stdout: true
    });
});