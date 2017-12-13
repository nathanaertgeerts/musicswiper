/*
we gaan gebruik maken van dit zodra we een id krijgen
//https://api.spotify.com/v1/tracks
*/
var express = require('express');
var bodyparser = require('body-parser');
var http = require("https");
var MongoClient = require('mongodb').MongoClient;
var request = require('request'); // "Request" library
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var db;
var users;
var dataC;
var token;
var SpotifyWebApi = require('spotify-web-api-node');
var spotifyApi = new SpotifyWebApi({
    clientId: 'fcecfc72172e4cd267473117a17cbd4d'
    , clientSecret: 'a6338157c9bb5ac9c71924cb2940e1a7'
    , redirectUri: 'http://www.example.com/callback'
});
MongoClient.connect('mongodb://localhost:27017/MusicAPP', function (err, _db) {
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
var client_secret = 'ab1a2b43cdb54c80b9c403179d51a0dd'; // Your secret
var key;
var liedjes = [];
var terug = [];
var redirect_uri = 'http://localhost:3000/callback';
var generateRandomString = function (length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    for (var i = 0; i < length; i++) {
        text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
};
var stateKey = 'spotify_auth_state';
var spotifyApi = new SpotifyWebApi({
    clientId: client_id
    , clientSecret: client_secret
});
app.use(function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});
app.use(express.static('client')).use(cookieParser());;
console.log("started");
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({
    extended: true
}));
var tokenExpirationEpoch;
// First retrieve an access token
app.get('/login', function (req, res) {
    var state = generateRandomString(16);
    res.cookie(stateKey, state);
    // your application requests authorization
    var scope = 'user-read-private user-read-email playlist-modify-public playlist-modify-private';
    res.redirect('https://accounts.spotify.com/authorize?' + querystring.stringify({
        response_type: 'code'
        , client_id: client_id
        , scope: scope
        , redirect_uri: redirect_uri
        , state: state
    }));
});

app.get('/callback', function (req, res) {
    // your application requests refresh and access tokens
    // after checking the state parameter
    var code = req.query.code || null;
    authorizationCode = code;
    console.log(code);
    var state = req.query.state || null;
    var storedState = req.cookies ? req.cookies[stateKey] : null;
    if (state === null || state !== storedState) {
        res.redirect('/#' + querystring.stringify({
            error: 'state_mismatch'
        }));
    }
    else {
        res.clearCookie(stateKey);
        var authOptions = {
            url: 'https://accounts.spotify.com/api/token'
            , form: {
                code: code
                , redirect_uri: redirect_uri
                , grant_type: 'authorization_code'
            }
            , headers: {
                'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
            }
            , json: true
        };
        request.post(authOptions, function (error, response, body) {
            console.log(response);
            if (!error && response.statusCode === 200) {
                var access_token = body.access_token
                    , refresh_token = body.refresh_token;
                token = access_token;
                spotifyApi.setAccessToken(token);
                var options = {
                    url: 'https://api.spotify.com/v1/me'
                    , headers: {
                        'Authorization': 'Bearer ' + access_token
                    }
                    , json: true
                };
                // use the access token to access the Spotify Web API
                request.get(options, function (error, response, body) {
                   // console.log(body);
                    users.insert(body, function (err, user) {
                        if (err) throw err;
                        console.log(user);
                    });
                });
                // we can also pass the token to the browser to make requests from there
                res.redirect('/#' + querystring.stringify({
                    access_token: access_token
                    , refresh_token: refresh_token
                }));
            }
            else {
                res.redirect('/#' + querystring.stringify({
                    error: 'invalid_token'
                }));
            }
        });
    }
});
spotifyApi.clientCredentialsGrant().then(function (data) {
    // Set the access token on the API object so that it's used in all future requests
    spotifyApi.setAccessToken(data.body['access_token']);
    return spotifyApi.getPlaylist('spotify', '37i9dQZF1DXcBWIGoYBM5M')
}).then(function (data) {
    console.log(data.body.tracks.items[0].track.id);
    for (var i = 0; i < data.body.tracks.items.length; i++) {
        console.log(data.body.tracks.items[i].track.id);
        liedjes.push(data.body.tracks.items[i].track.id)
    }
    for (var i = 0; i < liedjes.length; i++) {
        spotifyApi.getTrack(liedjes[i]).then(function (data) {
            if (data.body.preview_url != null) {
                terug.push({
                    'image-url': data.body.album.images[0].url
                    , 'preview_url': data.body.preview_url
                    , 'uri': data.body.uri
                    , 'artist-name': data.body.album.artists[0].name
                    , 'name': data.body.name
                });
            }
        }, function (err) {
            console.log('Something went wrong!', err);
        });
    }
}).catch(function (err) {
    console.log('Unfortunately, something has gone wrong.', err.message);
});
app.post('/random', function (res, req) {
    req.status(201).jsonp(terug);
         terug = [];
  
    var getRandomSongsArray = [ 'jazz','rock','pop','rmb','house','edm','vlaams','hard rock','bazart','rap','turkish','reggae','techno'];
      for (var i =  0; i < 10; i++){
   var getRandomSongs = getRandomSongsArray[randomIntInc(0, getRandomSongsArray.length)];
      var getRandomOffset = randomIntInc(1,1000);
spotifyApi.searchTracks(getRandomSongs,{ limit: 1, offset:getRandomOffset  }).then(function(data) {

       var dat= data.body.tracks.items[0];
        if (dat.preview_url != null) {
            terug.push({
                        'image-url': dat.album.images[0].url
                        , 'preview_url': dat.preview_url
                        , 'uri': dat.uri
                        , 'artist-name': dat.album.artists[0].name
                        , 'name': dat.name
                    });
        }
        console.log(terug);
    
  }, function(err) {
    console.log('Something went wrong!', err);
  });}
});
app.post('/startresearch', function (res, req) {
     var getRandomSongsArray = res.body.data;
    console.log(res.body.data);
       req.status(201).jsonp(terug);
         terug = [];
  
      for (var i =  0; i < 10; i++){
   var getRandomSongs = getRandomSongsArray[randomIntInc(0, getRandomSongsArray.length)];
      var getRandomOffset = randomIntInc(1,1000);
spotifyApi.searchTracks(getRandomSongs,{ limit: 1, offset:getRandomOffset  }).then(function(data) {

       var dat= data.body.tracks.items[0];
        if (dat.preview_url != null) {
            terug.push({
                        'image-url': dat.album.images[0].url
                        , 'preview_url': dat.preview_url
                        , 'uri': dat.uri
                        , 'artist-name': dat.album.artists[0].name
                        , 'name': dat.name
                    });
        }
      //  console.log(terug);
    
  }, function(err) {
    
    console.log('Something went wrong!', err);
  });}

});
var playlistId;
app.post('/createPlaylist', function (res, request) {
  var request = require("request");
    var getRandomSongsArray = res.body.list;
    console.log(getRandomSongsArray);
    console.log(res.body.name);
var options = { method: 'POST',
  url: 'https://api.spotify.com/v1/users/fatihk956/playlists',
  headers: 
   { 'cache-control': 'no-cache',
     authorization: 'Bearer  '+token },
  body: '{\r\n  "name": "'+res.body.name+'",\r\n  "description": "New playlist description",\r\n  "public": false\r\n}' };

request(options, function (error, response, body) {
  if (error) throw new Error(error);
var parsed = JSON.parse(body);
  console.log(parsed.id);
   
    tracks = res.body.list
    return spotifyApi.addTracksToPlaylist('fatihk956', parsed.id,getRandomSongsArray)
  .then(function(data) {
    console.log('Ok. Tracks added!');
});

});});
function randomIntInc(low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
}

app.set('port', (process.env.PORT || 3000));
app.listen(app.get('port'), function () {
    console.log('Server started on port ' + app.get('port'));
});