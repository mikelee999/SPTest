var express = require("express");
var app = express();

var ejs = require("ejs");
var bodyParser = require("body-parser");
var request = require("request");
var $ = require("jquery");



var fs = require("fs");

app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");

var mongoose = require("mongoose");
mongoose.Promise = global.Promise;
var mongoosePromise = mongoose.connect("mongodb://localhost:27017/sptest", {
    useMongoClient: true
});

var linkSchema = new mongoose.Schema({
    href: String,
    rel: String,
    method: String
});

//compile linkSchema prototype. is this needed? this schema is used only inside walletSchema
var Link = mongoose.model("Link", linkSchema);

var walletSchema = new mongoose.Schema({
   id: String,
   mobile_phone: String,
   immutable_id: String,
   status: String,
   program_owner_id: String,
   program_owner_name: String,
   program_id: String,
   program_name: String,
   user_id: String,
   create_date: String,
   update_time: String,
   //if bogus1 isn't in the schema, then when you create a Wallet object,
   //bogus1 won't show up as a property. However . . . if you modify an
   //existing Wallet object -- wallet["bogus1"] = "value", then bogus1
   //will show up in the Wallet object, at the root, outside the _doc namespace.
   //so what is the best practice here? to create a Wallet and add all properties
   //at create time, with ones not in the schema getting silently dropped?
   //Or to suck in all properties from my JSON object, thus "corrupting" the Wallet object?
   //When the objected is save()'d to the database, the corrupt values are dropped anyway.
   //But I could check for each property added to see where it ends up in the Wallet object
   //and thus detect changes to incoming objects that break the schema.
   //bogus1: String,
   //either of these definitions work with linkSchema required for mongoose < v3
   //TODO: test whether the linkSchema format gives any enforcement advantage to the literal way.
   links: [linkSchema]
   //links: [{href: String, method: String, rel: String}]
});

// compile Wallet prototype
var Wallet = mongoose.model("Wallet", walletSchema);



Wallet.find({}, 'immutable_id', function(err, dbWallets){
    if(err){
    var errString = err;
    } else {
       var errString = "Holy Shit, Batman!";
       dbWallets.forEach(function(wallet, index, array){
            console.log(wallet.immutable_id);
       });
   }
});     






// <!--<div class="container">-->
// <!--    <div class="row" style=display:flex; flex-wrap: wrap;">-->
// <!--    data.wallets.forEach(function(val,index,arr){-->
// <!--        <div class="col-lg-6 col-md-3">-->
// <!--        <ul>-->
// <!--        var keys = Object.keys(val);-->
// <!--        keys.forEach(function(kval,kindex,karr){-->
// <!--            <li><%= kval + " -- " + val[kval]</li><br>-->
// <!--        });-->
// <!--        </div>-->
// <!--        </ul>-->
// <!--    });-->

// <!--</div>-->
// <!--</div>-->

//     <!--var url = "https://8zjtcatzhf.execute-api.us-west-1.amazonaws.com/dev/wallets";-->
//     <!--request(url, function(error, response, body){-->
//     <!--    if(!error && response.statusCode == 200) {-->
//     <!--        var data = JSON.parse(body);-->
//     <!--        var rawdata = body;-->
//     <!--        var w = data.wallets[0]-->
//     <!--        var k = Object.keys(data.wallets[0]);-->
//     <!--        k.forEach(function(kval,kindex,karr){-->
//     <!--            console.log(kval + " -- " + w[kval])-->
//     <!--        })-->
//     <!--        //res.render("wallets", {data: data});-->
//     <!--        console.log("breakpoint");-->
//     <!--    }-->