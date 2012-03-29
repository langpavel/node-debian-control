var child_process = require('child_process');
var execFile = child_process.execFile;
var os = require('os');



exports.index = function(req, res) {
  execFile('passwd', ['-S', '-a'], {}, function(err, stdout, stderr) {
    users = [];
    stdout.split('\n').forEach(function(line) {
      var parts = line.split(/\s+/g);
      users.push({
        login: parts[0],
        passwordType: parts[1], //locked (L), no password (NP), usable password (P)
        last_change: new Date(parts[2]),
        min_age: parts[3], // days
        max_age: parts[4], // days
        warn_period: parts[5], // days
        inactivity_period: parts[6] // days
      });
    });
    res.render('users',{
      title: 'Users at '+os.hostname(),
      users: users
    });
  });
};

exports.configure = function(prefix, app) {
  app.get(prefix, exports.index); // list all services
};