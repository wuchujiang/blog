var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var MongodbStore = require('connect-mongo')(session);
var index = require('./routes/index');
var users = require('./routes/users');
var setting = require('./models/settings');
var flash = require('connect-flash');
var fs = require('fs');
var accessLog = fs.createWriteStream('access.log', { flags: 'a' });
var errorLog = fs.createWriteStream('error.log', { flags: 'a' });
var app = express();
// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(logger({
    stream: accessLog
}))
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(session({
    secret: setting.cookieSercet,
    key: setting.db,
    cookies: { maxAge: 100 * 60 * 60 * 24 * 30 }, //30days
    store: new MongodbStore({
        //db: setting.db,
        url: setting.host,
        //port: setting.port
    })
}));
app.use(flash());
app.use('/', index);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
    res.render('404');
});

// error handler
app.use(function(err, req, res, next) {
    // 将错误写入日志
    var meta = '[' + new Date() + ']' + req.url + '\n';
    errorLog.write(meta + err.stack + '\n');
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');


});

module.exports = app;