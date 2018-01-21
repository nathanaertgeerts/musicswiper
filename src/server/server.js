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
var SpotifyWebApi = require('spotify-web-api-node');
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
var standaard = [];
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
app.use(bodyparser.json());
app.use(bodyparser.urlencoded({
    extended: true
}));
onLoad();
app.post('/firstcall', function (req, res) {
    console.log(req.body);
    res.status(200).jsonp(standaard);
    createUser(req.body, req.body.genres);
});
app.post('/standardcall', function (req, res) {
    var userP;
    users.findOne({
        'id': req.body.id
    }, function (err, user) {
        if (user) {
            userP = user;
            if (user.toSend) res.status(200).jsonp(user.toSend);
            else res.status(200).jsonp(standaard);
            personaliseMusic(userP, req.body.token);
        }
        else {
            res.status(201).json("account bestaat niet");
        }
    })
});
app.post('/opslaan', function (req, res) {
    console.log(req.body.analyse);
    var data = JSON.parse(req.body.analyse);
    users.findOne({
        'id': req.body.id
    }, function (err, user) {
        if (user) {
            users.update({
                _id: ObjectId(user._id)
            }, {
                $push: {
                    saved: data.id
                    , forAnalyse: data
                }
            }, function () {
                users.find().toArray(function (error, best) {
                    if (error) {}
                    else {
                        if (best) {}
                        else {}
                    }
                });
            });
        }
        else {
            res.status(201).json("account bestaat niet");
        }
    })
});
var playlistId;
app.post('/createPlaylist', function (req, res) {
    console.log(req.body);
    var toSend = req.body.list.replace("[", "");
    toSend = toSend.replace("]", "");
    while (toSend.toLowerCase().indexOf(" ") >= 0) {
        toSend = toSend.replace(" ", "");
    }
    console.log(toSend);
    var options = {
        method: 'POST'
        , url: 'https://api.spotify.com/v1/users/' + req.body.id + '/playlists'
        , headers: {
            'Postman-Token': '10780304-d2a7-6908-5a4b-9f19c1b28061'
            , 'Cache-Control': 'no-cache'
            , 'Content-Type': 'application/json'
            , Authorization: 'Bearer ' + req.body.token
        }
        , body: {
            description: 'Created in Vibe'
            , name: req.body.name
            , public: false
        }
        , json: true
    };
    request(options, function (error, response, body) {
        if (error) throw new Error(error);
        console.log(body.id);
        var options = {
            method: 'POST'
            , url: 'https://api.spotify.com/v1/users/' + req.body.id + '/playlists/' + body.id + '/tracks'
            , qs: {
                position: '0'
                , uris: toSend
            }
            , headers: {
                'Postman-Token': '2d7f7850-b91b-5ca0-db10-7f6dcf712501'
                , 'Cache-Control': 'no-cache'
                , Authorization: 'Bearer ' + req.body.token
            }
        };
        request(options, function (error, response, body) {
            if (error) throw new Error(error);
            console.log(body);
            res.status(200).json("created");
        });
    });
});

function onLoad() {
    spotifyApi.clientCredentialsGrant().then(function (data) {
        // Set the access token on the API object so that it's used in all future requests
        spotifyApi.setAccessToken(data.body['access_token']);
        return spotifyApi.getPlaylist('spotify', '37i9dQZF1DXcBWIGoYBM5M')
    }).then(function (data) {
        for (var i = 0; i < data.body.tracks.items.length; i++) {
            liedjes.push(data.body.tracks.items[i].track.id)
        }
        for (var i = 0; i < liedjes.length; i++) {
            spotifyApi.getTrack(liedjes[i]).then(function (data) {
                if (data.body.preview_url != null) {
                    standaard.push({
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
    console.log("geladen");
}

function personaliseMusic(user, token) {
    var saveData = [];
    var id;
    console.log(user.forAnalyse);
    if(user.forAnalyse.length != 1){
        id = "4NHQUGzhtTLFvgF5SZesLK"
    }
      else{ id =user.forAnalyse[user.forAnalyse.length - 1].id;}
    console.log(id);
    var options = {
        method: 'GET'
        , url: 'https://api.spotify.com/v1/recommendations'
        , qs: {
            market: 'ES'
            , seed_tracks: id
            , seed_genres: 'techno,pop,rock,rap'
            , limit: '15'
        }
        , headers: {
            'Postman-Token': 'ddf61d72-378f-20d7-272e-b241e9f462a0'
            , 'Cache-Control': 'no-cache'
            , Authorization: 'Bearer ' + token
        }
    };
    request(options, function (error, response, body) {
        if (error) throw new Error(error);
        body = JSON.parse(body);
        for (var i = 0; i < body.tracks.length; i++) {
            var dat = body.tracks[i];
            if (dat.preview_url != null) {
                saveData.push({
                    'image-url': dat.album.images[0].url
                    , 'preview_url': dat.preview_url
                    , 'uri': dat.uri
                    , 'artist-name': dat.album.artists[0].name
                    , 'name': dat.name
                });
            }
        }
        users.update({
            _id: ObjectId(user._id)
        }, {
            $set: {
                toSend: saveData
            }
        }, function () {
            users.find().toArray(function (error, best) {
                if (error) {}
                else {
                    if (best) {}
                    else {}
                }
            });
        });
    });
}

function createUser(profile, list) {
    var toSend = list.replace("[", "");
    toSend = toSend.replace("]", "");
    while (toSend.toLowerCase().indexOf(" ") >= 0) {
        toSend = toSend.replace(" ", "");
    }
    console.log(profile);
    var newUser = {
        name: profile.name
        , email: profile.email
        , id: profile.id
        , product: profile.product
        , toSend: []
        , genres: toSend
        , forAnalyse: []
        , saved: []
        , timesCalled: 0
    };
    users.insert(newUser, function (err, user) {
        if (err) throw err;
        getNewRelease(user.ops[0], profile.token);
    });
}

function getNewRelease(user, token) {
    console.log(token);
    var saveData = [];
    var options = {
        method: 'GET'
        , url: 'https://api.spotify.com/v1/users/spotify/playlists/37i9dQZEVXblx4gen2MTvz'
        , headers: {
            'Cache-Control': 'no-cache'
            , Authorization: "Bearer " + token
        }
    };
    request(options, function (error, response, body) {
        if (error) throw new Error(error);
        body = JSON.parse(body);
        for (var i = 0; i < body.tracks.items.length; i++) {
            var dat = body.tracks.items[i].track;
            saveData.push({
                'image-url': dat.album.images[0].url
                , 'preview_url': dat.preview_url
                , 'uri': dat.uri
                , 'artist-name': dat.album.artists[0].name
                , 'name': dat.name
            });
        }
        users.update({
            _id: ObjectId(user._id)
        }, {
            $set: {
                toSend: saveData
            }
        }, function () {
            users.find().toArray(function (error, best) {
                if (error) {}
                else {
                    if (best) {}
                    else {}
                }
            });
        });
    });
}

function setAsNext() {}

function randomIntInc(low, high) {
    return Math.floor(Math.random() * (high - low + 1) + low);
}

function getRandom() {
    var random = [];
    var getRandomSongsArray = ['jazz', 'rock', 'pop', 'rmb', 'house', 'edm', 'vlaams', 'hard rock', 'bazart', 'rap', 'turkish', 'reggae', 'techno'];
    for (var i = 0; i < 10; i++) {
        var getRandomSongs = getRandomSongsArray[randomIntInc(0, getRandomSongsArray.length)];
        var getRandomOffset = randomIntInc(1, 1000);
        spotifyApi.searchTracks(getRandomSongs, {
            limit: 1
            , offset: getRandomOffset
        }).then(function (data) {
            var dat = data.body.tracks.items[0];
            if (dat.preview_url != null) {
                random.push({
                    'image-url': dat.album.images[0].url
                    , 'preview_url': dat.preview_url
                    , 'uri': dat.uri
                    , 'artist-name': dat.album.artists[0].name
                    , 'name': dat.name
                });
            }
        }, function (err) {
            console.log('Something went wrong!', err);
        });
    }
    return random;
}
app.set('port', (process.env.PORT || 3000));
app.listen(app.get('port'), function () {
    console.log('Server started on port ' + app.get('port'));
});