// For working with files in /etc/init.d
// see http://wiki.debian.org/LSBInitScripts

// CONSTANTS
var SERVICES_PATH = '/etc/init.d/'; //keep slash at end


var child_process = require('child_process');
var execFile = child_process.execFile;
var fs = require('fs');
var async = require('async');

// REGEXES
var re_service_status_all = /^\s+((\[\s*[+-?]]\s*\])\s+(.*))\s+$/mg;
var re_trimmed_newline = /\s*\n\s*/g;
var re_lsbattr = /([a-z-]+)\s*:\s*(.*)\s*/i;
var re_service_valid_name = /^[a-z0-9-.]+$/i;
var re_service_action_valid_name = /^[a-z-]+$/i;
var re_not_service_name = /(^skeleton|^README|\.dpkg-dist|\.dpkg-old|^rc|^rcS|^single|^reboot|^bootclean.sh)$/;


var setProperties = function(lines, target) {
  lines = lines.map(function(line){
    return line.match(/^\s*#\s?(.*)$/)[1];
  });
  var i, l, line, m, lastattr = null;
  for(i=0, l=lines.length;i<l;i++) {
    line = lines[i];
    if(m = line.match(re_lsbattr)) {
      target[lastattr = m[1].toLowerCase()] = m[2];
    } else {
        target[lastattr] += ' '+line;
    }
  }
};

var getServiceInfo = function(name, stat, cb) {
  fs.readFile(SERVICES_PATH+name, 'utf-8', function(err, text) {
    if(err)
      cb(err);
    else {
      var result = {
        name: name,
        stat: stat,
        content: text,
        properties: {}
      };

      var lines = text.split(re_trimmed_newline);
      var first = lines.indexOf('### BEGIN INIT INFO');
      var last = lines.indexOf('### END INIT INFO');

      if(first >= 0 && last >= 0) {
        setProperties(lines.slice(first+1,last), result.properties);
      }
      cb(null, result);
    }
  });
};

// discoverFile returns information about init script
var discoverFile = function(file, cb) {
  fs.stat(SERVICES_PATH+'/'+file, function(err, stat){
    if(err)
      cb(err);
    else {
      if((stat.mode & (1+8+64)) === 0) // exclude all no-executables
        cb();
      else {
        getServiceInfo(file, stat, cb);
      }
    }
  });
};


// PARAMETER PRE-ROUTE CHECKS
var serviceFileName = function(req, res, next, id) {
  req.service = req.service || {};
  if(id.match(re_service_valid_name) && !id.match(re_not_service_name)) {
    req.service.fileName = id;
    fs.stat(SERVICES_PATH+id, function(err, stat){
      req.service.stat = stat;
      next(err);
    });
  } else {
    next(new Error("Invalid service name"));
  }
};


var serviceInfo = function(req, res, next) {
  discoverFile(req.service.fileName, function(err, info){
    req.service = req.service || {};
    req.service.info = info;
    next(err);
  })
};

var serviceStatus = function(req, res, next) {
  next();
};

exports.index = function(req, res) {
  fs.readdir(SERVICES_PATH, function(err, files) {
    files = files.filter(function(name){
      // this is taken from /usr/sbin/service
      return !name.match(re_not_service_name);
    });
    async.map(files, discoverFile, function(err, services) {
      services = services.filter(function(a){ return a && !!a.name; });
      services = services.sort(function(a, b){ return a.name > b.name ? 1 : -1 });
      //console.log(arguments);
      res.render('services', {
        title: 'Services',
        services: services
      });
    });
  });
};

exports.detail = function(req, res) {
  res.render('service-detail', {
    title: (req.service.info.properties.provides || req.service.info.name)+': detail of service',
    service: req.service
  });
};

exports.serviceAction = function(req, res) {
  res.writeHead(200, {'Content-Type': 'text/plain'});
  var command = child_process.spawn('service', [req.body.service, req.body.action]);
  command.stdout.on('data', res.write.bind(res));
  command.stderr.on('data', res.write.bind(res));

  command.on('exit', function (code) {
    res.end('\nExit code: '+code);
  });
};

exports.configure = function(prefix, app) {
  app.param('serviceFileName', serviceFileName);

  app.get(prefix, exports.index); // list all services
  app.post(prefix, exports.serviceAction); // perform service action

  app.get(prefix+'/:serviceFileName', serviceInfo, serviceStatus, exports.detail);
};