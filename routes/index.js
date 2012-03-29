var child_process = require('child_process');
var execFile = child_process.execFile;


/*
 * GET home page.
 */

exports.index = function(req, res) {
  var uname = execFile('/bin/uname', ['-a'], {}, function (error, stdout, stderr) {
    res.render('index', {
      title: 'Debian Control',
      uname: stdout
    });
  });
};


exports.services = require('./services');