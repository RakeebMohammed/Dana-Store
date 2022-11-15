let createError = require('http-errors');
let express = require('express');
let path = require('path');
let cookieParser = require('cookie-parser');
let logger = require('morgan');
//let bodyParser = require('body-parser');
let hbs=require('express-handlebars')
let adminRouter = require('./routes/admin');
let usersRouter = require('./routes/users');
let fileUpload=require('express-fileupload')
let session = require("express-session");
 let db = require("./config/connection");
 const nocache = require("nocache");
const { handlebars } = require('hbs');
 
let app = express();

// view engine setup
app.use(
  session({
    secret: "keyboard cat",
    resave: false,
    saveUninitialized: true,
    cookie: { maxAge: 6000000 },
  })
);
app.use(nocache());




// app.use(require('connect').bodyParser());
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'hbs');
app.engine('hbs',hbs.engine({extname:'hbs',defaultLayout:'layout',layoutsDir:__dirname+'/views/layout/',partialsDir:__dirname+'/views/partials/'}))
app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(fileUpload())
db.connect((erro) => {
 if (erro) console.log("error connection");
 else console.log("database connected");
});
// hbs helper

//hbs helper
app.use('/', usersRouter);
app.use('/admin', adminRouter);
// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error',{rocket:true});
});

module.exports = app;