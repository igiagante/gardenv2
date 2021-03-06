/**
 * Created by Ignacio Giagante, on 19/12/17.
 */

let express = require('express'),
    cors = require('cors'),
    bodyParser = require('body-parser'),
    httpStatus = require('http-status'),
    expressWinston = require('express-winston'),
    expressValidation = require('express-validation'),
    helmet = require('helmet'),
    winstonInstance = require('winston'),
    routes = require('../app/routers/main_router'),
    config = require('./config'),
    APIError = require('../app/helpers/error/APIError');

let passport = require('passport'),
    expressValidator = require('express-validator');

// pass passport for configuration
require('../config/passport')(passport);

const app = express();

// parse body params and attache them to req.body
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// secure apps by setting various HTTP headers
app.use(helmet());

// enable CORS - Cross Origin Resource Sharing
app.use(cors());

// configure app to use bodyParser()
// this will let us get the data from a POST
app.use(bodyParser.json()); // for parsing application/json
app.use(bodyParser.urlencoded({extended: true})); // for parsing application/x-www-form-urlencoded
//app.use(multer()); // for parsing multipart/form-data
app.use(expressValidator()); // to validate requests

// Use the passport package in our application
app.use(passport.initialize());

// enable detailed API logging in dev env
if (config.env === 'development') {
    expressWinston.requestWhitelist.push('body');
    expressWinston.responseWhitelist.push('body');
    app.use(expressWinston.logger({
        winstonInstance,
        meta: true, // optional: log meta data about request (defaults to true)
        msg: 'HTTP {{req.method}} {{req.url}} {{res.statusCode}} {{res.responseTime}}ms',
        colorStatus: true // Color the status code (default green, 3XX cyan, 4XX yellow, 5XX red).
    }));
}

// mount all routes on /api path
app.use('/api', routes);

// if error is not an instanceOf APIError, convert it.
app.use((err, req, res, next) => {
    if (err instanceof expressValidation.ValidationError) {
        // validation error contains errors which is an array of error each containing message[]
        const unifiedErrorMessage = err.errors.map(error => error.messages.join('. ')).join(' and ');
        const error = new APIError(unifiedErrorMessage, err.status, true);
        return next(error);
    } else if (!(err instanceof APIError)) {
        const apiError = new APIError(err.message, err.status, err.isPublic);
        return next(apiError);
    }
    return next(err);
});

// catch 404 and forward to error handler
app.use((req, res, next) => {
    const err = new APIError(httpStatus.NOT_FOUND, 'API not found');
    return next(err);
});

// log error in winston transports except when executing test suite
if (config.env !== 'test') {
    app.use(expressWinston.errorLogger({
        winstonInstance
    }));
}

// error handler
app.use((err, req, res, next) => // eslint-disable-line no-unused-vars
    res.status(err.status).json({
        status : err.status,
        errorType: err.errorType,
        errorCode: err.errorCode,
        errorMessage: err.message
    })
);

//static
console.log('process.cwd(): ' + process.cwd());
app.use(express.static(process.cwd() + '/public'));

module.exports = app;
