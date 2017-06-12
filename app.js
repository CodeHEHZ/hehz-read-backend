let express = require('express'),
    path = require('path'),
    favicon = require('serve-favicon'),
    logger = require('morgan'),
    cookieParser = require('cookie-parser'),
    bodyParser = require('body-parser'),
    responseTime = require('response-time'),
    passport = require('passport'),
    LocalStrategy = require('passport-local').Strategy,
    session = require('express-session'),
    RedisStore = require('connect-redis')(session),
    checkUserStatus = require('./api/util/checkUserStatus.middleware');

let index = require('./api'),
    user = require('./api/user'),
    group = require('./api/group'),
    book = require('./api/book'),
    question = require('./api/question'),
    captcha = require('./api/captcha'),
    upload = require('./api/upload');


let app = express();

app.use(express.static(__dirname + '/views'));

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));

app.use(responseTime());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'views')));
app.use(session({
    store: new RedisStore({
        host: process.env.REDIS_HOST || '127.0.0.1'
    }),
    secret: process.env.SESSION_SECRET || 'read@hehz2016',
    resave: true,
    saveUninitialized: true
}));

app.use(passport.initialize());
app.use(passport.session());

let whitelist = process.env.CORS_WHITELIST || [];

app.use(function(req, res, next) {
    res.header('Access-Control-Allow-Origin', whitelist.includes(req.headers.origin) ? req.headers.origin : 'https://read.hehlzx.cn');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept');
    res.header('Access-Control-Allow-Credentials', true);
    res.header('Access-Control-Allow-Methods', 'GET, PUT, POST, DELETE, HEAD');
    next();
});

app.use(checkUserStatus);

app.use('/', index);
app.use('/user', user);
app.use('/group', group);
app.use('/book', book);
app.use('/question', question);
app.use('/captcha', captcha);
app.use('/upload', upload);

let User = require('./api/schema').User;
passport.use(new LocalStrategy(User.authenticate()));
passport.serializeUser(User.serializeUser());
passport.deserializeUser(User.deserializeUser());

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    let err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500).send(err.message);
});

module.exports = app;
