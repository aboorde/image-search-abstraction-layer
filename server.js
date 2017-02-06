var express = require("express");
var path = require("path");
var pug = require("pug");
//lets require/import the mongodb native drivers.
var mongodb = require('mongodb');
var Bing = require('node-bing-api')({ accKey: process.env.BING_API });



var MongoClient = mongodb.MongoClient;
var mongoUrl = process.env.MONGOLAB_URI;
//var mongoUrl = 'mongodb://localhost:27017/test';   
var app = express()

function AddRecentSearch(collectionSearchArr, searchString) {
    var timestamp = new Date();
    collectionSearchArr.push({"term": searchString, "time": timestamp});
    if (collectionSearchArr.length > 10) {
        collectionSearchArr.shift();
    }
    //console.log(JSON.stringify(collectionSearchArr))
    return collectionSearchArr;
}


app.set('view engine', 'pug')
app.set('views', path.join(__dirname, 'views'))
app.get('/', function(req, res) {
    res.render('index');
});
app.get('/api/search', function(request, result) {
    //var query = req.query;
    var searchString = request.query.query;
    var queryOffset = request.query.offset;
    var resArr = [];
    //if both necessary parameters exist
    if(searchString && queryOffset) {
        Bing.images(searchString, {
            count: 10,   // Number of results (max 50)
            offset: queryOffset    // Skip first 3 result
            }, function(error, res, body){
                var returnedResults = body.value;
                returnedResults.forEach(function(returnedResult) {
                    var resultObj = {
                        url: returnedResult.contentUrl,
                        snippet: returnedResult.name,
                        thumbnail: returnedResult.thumbnailUrl,
                        context: returnedResult.hostPageDisplayUrl
                    };
                    resArr.push(resultObj);
                });
                
                MongoClient.connect(mongoUrl, function (err, db) {
                    if (err) {
                        console.log('Unable to connect to the mongoDB server. Error:', err);
                    } else {
                        console.log('Connection established to', mongoUrl);
                        var recentSearches = db.collection('recent');
                        var collectionSearchArr = [];
                        var newSearchArr = [];
                        // do some work here with the database.
                        recentSearches.find({
                            recentList: "recentList"
                        }).toArray(function(err,docs) {
                            if (err) throw err;
                            //console.log(docs[0].recentSearches);
                            collectionSearchArr = docs[0].recentSearches;
                            newSearchArr = AddRecentSearch(collectionSearchArr, searchString);
                            console.log(JSON.stringify(newSearchArr))
                            //UpdateRecentSearches(newSearchArr);
                            recentSearches.update({recentList: "recentList"}, {recentList: "recentList", recentSearches: newSearchArr});
                            db.close();
                        });
                        //console.log(newSearchArr) -- returns empty
                    }
                });
                result.send(resArr);
            });
    } else {
        result.send("Format queries correctly");
    }
});
app.get('/api/latest/search', function(req, res) {
    MongoClient.connect(mongoUrl, function (err, db) {
        if (err) {
            console.log('Unable to connect to the mongoDB server. Error:', err);
        } else {
            console.log('Connection established to', mongoUrl);
            var recentSearches = db.collection('recent');
            recentSearches.find({
                recentList: "recentList"
            }).toArray(function(err, docs) {
                if (err) throw err;
                var recentSearchList = docs[0].recentSearches;
                res.send(recentSearchList);
                db.close();
            });
        }
    });
});
app.listen(process.env.PORT || 8080, function () {
  console.log('Example app listening on port 3000!')
});