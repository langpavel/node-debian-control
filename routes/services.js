// For working with files in /etc/init.d
// see http://wiki.debian.org/LSBInitScripts

// CONSTANTS
var SERVICES_PATH = '/etc/init.d/'; //keep slash at end


var child_process = require('child_process');
var execFile = child_process.execFile;
var fs = require('fs');
var async = require('async');


var re_service_status_all = /^\s+((\[\s*[+-?]]\s*\])\s+(.*))\s+$/mg;

var re_trimmed_newline = /\s*\n\s*/g;

var re_lsbattr = /([a-z-]+)\s*:\s*(.*)\s*/i;

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

exports.index = function(req, res) {
  fs.readdir(SERVICES_PATH, function(err, files) {
    async.map(files, discoverFile, function(err, services) {
      services = services.filter(function(a){ return a && !!a.name });
      services = services.sort(function(a, b){ return a.name > b.name ? 1 : -1 });
      //console.log(arguments);
      res.render('services', {
        title: 'Services',
        services: services
      });
    })
  })
};