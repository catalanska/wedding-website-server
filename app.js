// Init server and Ig Client
var init = require('./lib/init');
var app = init.app;
var igClient = init.igClient;

// Connect to database
var config = require('./lib/config');
var mongodb = require('mongodb');
var mongoClient = mongodb.MongoClient;

var igCollection, subscriptionsCollection;
mongoClient.connect(config.db, function(err, db) {
    igCollection = db.collection('instagram');
    subscriptionsCollection = db.collection('subscriptions');
});

// Setup endpoints

// Ping endpoint to check status
app.get('/ping', function (req, res) {
        res.end('PONG');
});

// Retrieve list of selectedPhotos and return to client
app.route('/selectedPhotos')
    .get(function (req, res) {
        igCollection.find({show: true}).sort({created_time: -1}).toArray(function (err, docs) {
            res.json(docs);
        });
    }
);

// Retrieve list of all tagged photos and return to client
app.route('/taggedPhotos')
    .get(function (req, res) {
        var reqType = req.query.reqType;
        if(reqType === 'refresh'){
            updateAllSubscriptions(function(){
                igCollection.find().sort({created_time: -1}).toArray(function (err, docs) {
                    res.json(docs);
                });
            });

        }else{
            igCollection.find().sort({created_time: -1}).toArray(function (err, docs) {
                res.json(docs);
            });
        }
    }
);

app.route('/taggedPhotos/:id')
    // To update a stored photo
    .put(function (req, res) {
        igCollection.update({id: req.params.id}, {$set: req.body}, function (err, result) {
            if(err){ console.log(err);res.status(500); }
            else res.status(200);
            res.end();
        });
    })
    // To delete a stored photo
    .delete(function(req, res){
        igCollection.remove({id: req.params.id}, function (err, result) {
            if(err){ console.log(err);res.status(500); }
            else res.status(200);
            res.end();
        });
    });

app.route('/taggedPhotoSubscription')
    // To confirm subscription
    .get(function (req, res) {
        res.send(req.query['hub.challenge']);
    })
    // To receive updates from IG
    .post(function (req, res) {
        var subscriptions = req.body;
        updateSubscriptions(subscriptions);
        res.json('OK');
    }
);

// Subscription creation & first import
// curl -H "Content-Type: application/json" -d '{"tag":"esteryjavi"}' http://localhost:3000/createTaggedPhotoSubscription
app.post('/createTaggedPhotoSubscription', function (req, res) {
    var tag = req.body.tag;
    igClient.add_tag_subscription(tag, 'http://www.esteryjaviycomieronperdices.es/taggedPhotoSubscription', [], function(err, result, remaining, limit){
        if(err) console.log("Error creting subscription: "+err);
        initSubscription(tag,function(subscription){
            getNewTaggedPhotos(subscription, function(photosNo){
                res.json('OK');
            });
        });
    });
});

var getNewTaggedPhotos = function(subscription, callback) {
    igClient.tag_media_recent(subscription.tag, {min_tag_id: subscription.minTagId}, function (err, medias, pagination, remaining, limit) {
        storeNewTaggedPhotos(subscription, medias, pagination, function(newInserts){
            callback({tag: subscription.tag, newInserts: newInserts});
        });
    });
};

var storeNewTaggedPhotos = function(subscription, photos, pagination, callback){
    if(photos.length > 0){
        var processed, newInserts = 0;
        for (idx in photos) {
            insertPhotoInDB(photos[idx], function(newInsert){
                if(newInsert) newInserts++;
                if (++processed == photos.length) {
                    if (pagination && pagination.min_tag_id) {
                        updateSubscription(subscription, pagination.min_tag_id, function() {
                            if (pagination.next) pagination.next(function (err, photos, pagination, remaining, limit){ storeNewTaggedPhotos(subscription, photos, pagination, callback) });
                            else callback(newInserts);
                        });
                    }else callback(newInserts);
                }
            });
        }
    }else{
        callback(0);
    }

};

var insertPhotoInDB = function(photo, callback){
    photo.show = true;
    igCollection.find({id: photo.id}).toArray(function(err, result) {
        if(result.length == 0){
            igCollection.insert(photo, function(err, result) {
                if(err) console.log("Error while insert "+err);
                callback(true);
            });
        }else{
            callback(false);
        }
    });

};

var initSubscription = function(tag, callback){
    subscriptionsCollection.insert({'tag': tag}, function(err, result) {
        if(err) console.log(err);
        callback(result[0]);
    });
};

var updateAllSubscriptions = function(callback){
    subscriptionsCollection.find({}).toArray(function(err, subscriptions) {
        if(err) console.log(err);
        if(subscriptions.length > 0){
            var processed = 0;
            for(idx in subscriptions){
                var s = subscriptions[idx];
                getNewTaggedPhotos(s, function(res){
                    processed++;
                    if(processed == subscriptions.length) {
                        callback();
                    }
                });
            }
        }else{
            callback();
        }
    });
};

var updateSubscriptions = function(subscriptions){
    for(idx in subscriptions){
        getSubscription(subscriptions[idx].object_id, function(subscription){
            if(subscription){
                getNewTaggedPhotos(subscription, function(res){
                    console.log('>>> Subscription: '+res.tag+'; '+res.newInserts+' new photos properly inserted');
                });
            }
        });
    }
};

var getSubscription = function(tag, callback){
    subscriptionsCollection.find({'tag': tag}).limit(1).toArray(function(err, config) {
      callback(config[0]);
    });
};

var updateSubscription = function(subscription, minTagId, callback){
    subscription.minTagId = minTagId;
    subscriptionsCollection.update({_id:subscription._id}, subscription, function(err, config){
        if(err) console.log(err);
        callback();
    });
};
