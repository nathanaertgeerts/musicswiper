var express = require('express');
var bodyparser = require('body-parser');
var MongoClient = require('mongodb').MongoClient;

var request = require('request'); // "Request" library
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var db;
var users;
var dataC;
var SpotifyWebApi = require('spotify-web-api-node');
var spotifyApi = new SpotifyWebApi({
  clientId : 'fcecfc72172e4cd267473117a17cbd4d',
  clientSecret : 'a6338157c9bb5ac9c71924cb2940e1a7',
  redirectUri : 'http://www.example.com/callback'
});
MongoClient.connect('mongodb://localhost:27017/neverlost', function (err, _db) {
    if (err) throw err; // Let it crash
    console.log("Connected to MongoDB");
    db = _db;
    users = db.collection('users');
    dataC = db.collection('data');
});
var app = express();
app.use(express.static('client'));
var ObjectId = require('mongodb').ObjectId;
var authorizationCode = 'AQAgjS78s64u1axMCBCRA0cViW_ZDDU0pbgENJ_-WpZr3cEO7V5O-JELcEPU6pGLPp08SfO3dnHmu6XJikKqrU8LX9W6J11NyoaetrXtZFW-Y58UGeV69tuyybcNUS2u6eyup1EgzbTEx4LqrP_eCHsc9xHJ0JUzEhi7xcqzQG70roE4WKM_YrlDZO-e7GDRMqunS9RMoSwF_ov-gOMpvy9OMb7O58nZoc3LSEdEwoZPCLU4N4TTJ-IF6YsQRhQkEOJK';

process.on('SIGINT', function () {
    console.log("Shutting down");
    db.close();
    process.exit(0);
});
var client_id = 'a6bc93497c864a53b619c198ed655a2c'; // Your client id
var client_secret = '529690a579204b488fea73cb6b149de7'; // Your secret
var redirect_uri = 'http://localhost:3000/callback';
var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};
var stateKey = 'spotify_auth_state';

var spotifyApi = new SpotifyWebApi({
  clientId : client_id,
  clientSecret : client_secret
});
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
app.use(express.static('client'))
 .use(cookieParser());;
console.log("started");
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({
    extended: true
}));

var tokenExpirationEpoch;
spotifyApi.clientCredentialsGrant()
  .then(function(data) {
    console.log('The access token expires in ' + data.body['expires_in']);
    console.log('The access token is ' + data.body['access_token']);

    // Save the access token so that it's used in future calls
    spotifyApi.setAccessToken(data.body['access_token']);
     return spotifyApi.getArtistTopTracks('0oSGxfWSnnOXhD2fKuz2Gy', 'GB')
  }).then(function(data) {
    console.log('The most popular tracks for David Bowie is..');
    console.log('Drum roll..')
    console.log(data.body.tracks)

  }, function(err) {
    console.log('Something went wrong when retrieving an access token', err.message);
  });
// First retrieve an access token
app.get('/login', function(req, res) {

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});


app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };

    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;

        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
        });

        // we can also pass the token to the browser to make requests from there
        res.redirect('/#' +
          querystring.stringify({
            access_token: access_token,
            refresh_token: refresh_token
          }));
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});
/*app.post('/api/register', function (req, res) {
    if (req.body.name && req.body.email && req.body.phone && req.body.username && req.body.password != null) {
        var newUser = {
            name: req.body.name
            , email: req.body.email
            , phone: req.body.phone
            , username: req.body.username
            , password: req.body.password
            , id: uniqid()
            , devId: null
        };
        users.insert(newUser, function (err, user) {
            if (err) throw err;
            console.log(user);
            res.status(201).jsonp("succes");
        });
    }
    else {
        console.log(req.body);
        res.status(201).jsonp("error");
    }
});
app.post('/api/login', function (req, res) {
    console.log(req.body.username);
    users.findOne({
        'username': req.body.username
        , "password": req.body.password
    }, function (err, user) {
        if (user) {
            users.findOne().toArray(function (error, user) {
                if (error) {
                    res.status(201).json({
                        succes: false
                        , text: "error"
                        , user: []
                    });
                }
                else {
                    res.status(201).json({
                        "text": "account gevonden"
                        , user: user
                    });
                }
            });
        }
        else {
            res.status(201).json("account bestaat niet");
        }
    })
});*/

app.set('port', (process.env.PORT || 3000));
app.listen(app.get('port'), function () {
    console.log('Server started on port ' + app.get('port'));
});