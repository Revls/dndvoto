var twitter = require('ntwitter')
  , cfg = require('./config')
  , data = require('./stuff'); 

var twit = new twitter(cfg.twitter);

twit.verifyCredentials(function (err, data) {
  console.log('ok');
});

function startStream(){
  twit.stream('user', { }, function(stream) {
    stream.on('data', function (data) {
    	var text = {
    		to:  data.user.screen_name,
    		txt: data.text
    	};
      if (text.txt.indexOf(cfg.user) === 0) {
        data(text, function(twitt){
         if (twitt instanceof Error){
            console.dir(text);
          } else {
            twit.updateStatus(twitt, function(error){
              if (error) console.error(error);
            });
          }
        });
      }
      console.dir(text);
    });
    // ntwitter bug. Too easy to care.
    stream.on('error', function (type, code){
    	// IGNORE MOST OF this
      if (type && type.text && type.text.indexOf(cfg.user) === 0)	{
        var text = {
          to:  type.user.screen_name,
          txt: type.text
        };
        data(text, function(twitt){
          if (twitt instanceof Error){
            console.dir(text);
          } else {
            twit.updateStatus(twitt, function(error){
              if (error) console.error(error);
            });
          }
        });
      } 
      console.log('ERROR');
    })
    stream.on('end', function (response) {
      startStream();
    });
    stream.on('destroy', function (response) {
      startStream();
    });
  });
}

// INIT ALL THE THINGS

// Server
require('http').createServer(require('ecstatic')(__dirname + '/public')).listen(8080);

// twitter stream
startStream();
