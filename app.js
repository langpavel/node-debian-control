
/**
 * Module dependencies.
 */

var optimist = require('optimist'); // for cmdline options: https://github.com/substack/node-optimist
var express = require('express'); // web framework: http://expressjs.com/guide.html
var stylus = require('stylus'); // css preprocessor: http://learnboost.github.com/stylus
var nib = require('nib'); // css macros for stylus: https://github.com/visionmedia/nib

var routes = require('./routes');

var app = module.exports = express.createServer();

// Configuration

app.configure(function() {
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(app.router);
  app.use(express.static(__dirname + '/public'));
  app.use(stylus.middleware({
    src: __dirname,
    compile: function(str, path) {
      return stylus(str)
        .set('filename', path)
        .set('compress', true)
        .use(nib());
    }
  }));
});

app.configure('development', function(){
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
});

app.configure('production', function(){
  app.use(express.errorHandler());
});

// Routes

// Main page
app.get('/', routes.index);

// Services
routes.services.configure('/services', app);

// Users
routes.users.configure('/users', app);

app.listen(3000);
console.log("Express server listening on port %d in %s mode", app.address().port, app.settings.env);
