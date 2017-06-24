/**
 * Initialising the project: `gulp dist`
 * Watching: `gulp`
 * Clean dist dir: `gulp clean`
 * Switch dist mode from dev to prod: add `-p` or `--production` arg to any task (enables uglify, disables sourcemaps)
 */

let autoprefixer = require('gulp-autoprefixer'),
    batch = require('gulp-batch'),
    browserify = require('browserify'),
    browserSync = require('browser-sync'),
    buffer = require('vinyl-buffer'),
    changed = require('gulp-changed'),
    concat = require('gulp-concat'),
    cleanCss = require('gulp-clean-css'),
    del = require('del'),
    fs = require('fs'),
    gulp = require('gulp'),
    gutil = require('gulp-util'),
    imagemin = require('gulp-imagemin'),
    notify = require('gulp-notify'),
    plumber = require('gulp-plumber'),
    rename = require('gulp-rename'),
    runSequence = require('run-sequence'),
    sass = require('gulp-sass'),
    source = require('vinyl-source-stream'),
    sourcemaps = require('gulp-sourcemaps'),
    svgmin = require('gulp-svgmin'),
    svgstore = require('gulp-svgstore'),
    through = require('through2'),
    tsify = require('tsify'),
    tslint = require('gulp-tslint'),
    uglify = require('gulp-uglify'),
    watch = require('gulp-watch');

// Additional files to be included by scss
let scssInclude = [
    './node_modules/foundation-sites/scss',
    './node_modules/normalize.css'
];

let productionBuild = false; // Dev mode by default

function empty() { // Enables us to disable certain plugins in dev modes
    return through.obj((file, enc, cb) => {
        cb(null, file);
    });
}

// Switch to production mody by passing -p or --production as an additional argument to gulp
process.argv.forEach((e) => {
    if (['-p', '--production'].includes(e)) {
        // disable sourcemaps in production
        sourcemaps = {
            init() {
                return empty();
            }, write() {
                return empty();
            }
        };
        // Set build mode
        productionBuild = true;
    }
});

if (!productionBuild) {
    cleanCss = uglify = empty;
}

const srcBase = './assets-src';
const THEME_NAME = 'testtheme';

// Set the dir for your theme
let themeBase = `./wordpress/wp-content/themes/${THEME_NAME}`;
let distBase = `./wordpress/wp-content/themes/${THEME_NAME}/assets`;

if (distBase === './wordpress/wp-content/themes/testtheme/assets') {
    console.log('Remember to setup the dir for your theme!')
}

// Now let us configure some paths
let paths = {
    src: {
        base: srcBase,
        images: srcBase + '/images/**/*.{jpg,png,gif,svg}',
        svg: srcBase + '/svg/**/*.svg',
        scss: srcBase + '/scss/**/*.scss',
        ts: srcBase + '/ts/app.ts',
        allTs: srcBase + '/ts/**/*.ts',

        // This is a list of js files that will be concatenated and saved as vendor.js file.
        // For stuff that can not be imported into the project with `import`...
        vendorJs: []
    },
    dist: {
        base: distBase,
        images: distBase + '/images/',
        css: distBase + '/css/',
        js: distBase + '/js/'
    }
};

console.log('------------------------------------------------------');
console.log('productionBuild (true for production build): ', productionBuild);
console.log('------------------------------------------------------');

// Compile scss
gulp.task('scss', () => gulp.src(paths.src.scss)
    .pipe(plumber(function (error) {
        gutil.log(gutil.colors.red(error.message));
        this.emit('end');
    }))
    .pipe(sourcemaps.init())
    .pipe(sass({
        errLogToConsole: true,
        includePaths: scssInclude
    }))
    .pipe(autoprefixer({
        browsers: ['last 2 versions']
    }))
    .pipe(cleanCss())
    .pipe(sourcemaps.write())
    .pipe(gulp.dest(paths.dist.css))
);

gulp.task('tslint', () =>
    gulp.src(paths.src.allTs)
        .pipe(tslint({
            formatter: 'verbose'
        }))
        .pipe(tslint.report({emitError: false, summarizeFailureOutput: true}))
);

gulp.task('ts', () =>
    browserify({debug: (productionBuild === false)})
        .add(paths.src.ts)
        .plugin(tsify)
        .bundle()
        .on('error', function (error) {
            console.error(error.toString());
            this.emit('end');
        })
        .pipe(plumber())
        .pipe(source('scripts.js'))
        .pipe(buffer())
        .pipe(uglify())
        .pipe(gulp.dest(paths.dist.js))
);

// Concat and minify JS Includes
gulp.task('scripts-vendor', () => {
    if (paths.src.vendorJs.length) {
        return gulp.src(paths.src.vendorJs)
            .pipe(uglify())
            .pipe(concat('vendor.js'))
            .pipe(gulp.dest(paths.dist.js));
    }
});

// Minify and copy images
gulp.task('imagemin', () =>
    gulp.src(paths.src.images)
        .pipe(changed(paths.dist.images))
        .pipe(imagemin([
            imagemin.gifsicle({
                interlaced: true
            }),
            imagemin.jpegtran({
                progressive: true
            }),
            imagemin.optipng({
                optimizationLevel: 5
            }),
            imagemin.svgo({
                plugins: [{
                    convertPathData: {
                        floatPrecision: 0
                    }
                }]
            })
        ]))
        .pipe(gulp.dest(paths.dist.images))
);

// Buld an svg sprite to be inlined in index.php later
gulp.task('svg-sprite', () =>
    gulp.src([paths.src.svg])
        .pipe(svgo({
            plugins: [
                {
                    removeTitle: true
                }, {
                    convertPathData: {
                        floatPrecision: 1
                    }
                }
            ]
        }))
        .pipe(rename({prefix: 'image-'}))
        .pipe(svgstore({inlineSvg: true}))
        .pipe(rename({basename: 'inline-svgsprite', extname: '.php'}))
        .pipe(gulp.dest(paths.dist.images))
);

// Browser-sync - proxy requests to our phpfpm container
gulp.task('browser-sync', () => {
    browserSync.init({
        proxy: "localhost", //:80
        open: false,
        notify: false
    });
});

// Reload
gulp.task('browser-reload', () => {
    browserSync.reload();
});

// Empty dist dir
gulp.task('clean', () => {
    del([paths.dist.base + '/**', '!' + paths.dist.base], '!' + paths.dist.base + '/.gitkeep').then(paths => {
        console.log('Deleted: files and folders:\n', paths.join('\n'));
    });
});

// Build the whole project by launching tasks synchronously
gulp.task('dist', cb => {
    runSequence(
        'clean', 'scss', 'tslint', 'ts', 'scripts-vendor', 'imagemin', 'svg-sprite', /*'copy-index', 'copy-app', 'copy-statics',*/ cb
    );
});

// Default task. Should be preceded by `gulp dist`. Watches for changes, launches tasks and reloads the browser. Nice!
gulp.task('default', ['browser-sync'], function () {
    watch(paths.src.allTs, batch((events, done) => {
        runSequence('tslint', 'ts', 'browser-reload', done);
    }));

    watch(paths.src.scss, batch((events, done) => {
        runSequence('scss', 'browser-reload', done);
    }));

    watch(paths.src.images, batch((events, done) => {
        runSequence('imagemin', 'browser-reload', done);
    }));

    watch(paths.src.svg, batch((events, done) => {
        runSequence('svg-sprite', 'copy-index', 'browser-reload', done);
    }));

    watch(themeBase + '/**/*.php', batch((events, done) => {
        runSequence('browser-reload', done);
    }));
});
