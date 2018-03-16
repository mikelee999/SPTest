var express    = require("express"),
    ejs        = require("ejs"),
    bodyParser = require("body-parser"),
    request    = require("request"),
    $          = require("jquery"),
    fs         = require("fs"),
    uuid       = require("uuid-random"),
    mongoose   = require("mongoose");


var app = express();
app.use(express.static("public"));
app.use(bodyParser.urlencoded({extended: true}));
app.set("view engine", "ejs");

mongoose.Promise = global.Promise;

var mongooseConnection = mongoose.connect("mongodb://localhost:27017/sptest", {
    useMongoClient: true
});

//schemas for attributes inside other documents
//linkSchema is in walletSchema
var linkSchema = new mongoose.Schema({
    href: String,
    rel: String,
    method: String
});

//match_criteriaSchema is in programSchema
var match_criteriaSchema = new mongoose.Schema({
   language: String,
   region: String
});

//schemas for mongo document collections

// any attribute that is frequently queried when retrieving a single record
// or a subset from a collection should go in the
// versiontable collection that accompanies each "real" object.
// in essence, the versiontable is like an AD global catalog,
// along with other things.
// the versiontable allows for never 
// updating anything in e.g. the wallets collection--you just add
// entire new records with a new version. Why do this? lotsa reasons.
// each wallet now has a log of each change directly in the table.
// it's more efficient performance-wise. it simplifies "transactions"--
// the only update is to the record in the versiontable. If that succeeds,
// the update is committed; if it fails, that's an automatic "rollback"--
// the new record in the object database is just ignored.
var versionTableWalletSchema = new mongoose.Schema({
    id: String,
    immutable_id: String,
    current_version: String,
    mobile_phone: String,
    user_id: String,
    status: String,
    program_owner_id: String,
    program_owner_name: String,
    update_time: String
});

var walletSchema = new mongoose.Schema({
   id: String,
   mobile_phone: String,
   immutable_id: String,
   user_id: String,
   record_version: String,
   status: String,
   program_owner_id: String,
   program_owner_name: String,
   program_id: String,
   program_name: String,
   create_date: String,
   update_time: String,
   //if bogus1 isn't in the schema, then when you create a Wallet object,
   //bogus1 won't show up as a property. However . . . if you modify an
   //existing Wallet object -- wallet["bogus1"] = "value", then bogus1
   //will show up in the Wallet object, at the root, outside the _doc namespace.
   //so what is the best practice here? to create a Wallet from a json object and blindly add all properties
   //at create time, with ones not in the schema getting silently dropped?
   //Or to suck in all properties from my JSON object, thus "corrupting" the Wallet object?
   //When the objected is save()'d to the database, the corrupt values are dropped anyway.
   //But I could check for each property added to see where it ends up in the Wallet object
   //and thus detect changes to incoming objects that break the schema.
   //bogus1: String,
   //either of these definitions work with linkSchema required for mongoose < v3
   //TODO: test whether the linkSchema format gives any enforcement advantage compared to the literal way.
   links: [linkSchema]
   //links: [{href: String, method: String, rel: String}]
});

var versionTableProgramSchema = new mongoose.Schema({
    current_version: String,
    name: String,
    program_owner: String,
    status: String,
    active_date: String,
    match_criteria: [match_criteriaSchema],
    update_time: String
});

var programSchema = new mongoose.Schema({
   id: String,
   record_version: String,
   name: String,
   program_owner: String,
   status: String,
   active_date: String,
   match_criteria: [match_criteriaSchema],
   create_date: String,
   update_time: String,
   links: [linkSchema]
});

var versionTableUserSchema = new mongoose.Schema({
    id: String,
    current_version: String,
    mobile_phone: String,
    links: [linkSchema],
    update_time: String
});

var userSchema = new mongoose.Schema({
   id: String,
   record_version: String,
   given_name: String,
   family_name: String,
   email: String,
   birth_date: String,
   mobile_phone: String,
   address_country: String,
   address_region: String,
   address_locality: String,
   post_code: String,
   street_address: String,
   create_date: String,
   update_time: String,
   links: [linkSchema]
});

// compile mongoose document prototypes
//mongoose automatically pluralizes collection names in the database to correspond to these prototypes
// first, compile "attribute" schemas. is this really needed?
// links are on wallets, users, etc.
var Link = mongoose.model("Link", linkSchema);
//match_criteria are on programs
var Match_criteria = mongoose.model("Match_criteria", match_criteriaSchema);

var VersionTableWallet = mongoose.model("VersionTableWallet", versionTableWalletSchema);
var Wallet = mongoose.model("Wallet", walletSchema);
var VersionTableProgram = mongoose.model("VersionTableProgram", versionTableProgramSchema);
var Program = mongoose.model("Program", programSchema);
var VersionTableUser = mongoose.model("VersionTableUser", versionTableUserSchema);
var User = mongoose.model("User", userSchema);






//test code for inserting new wallets into the database

// var w4 = new Wallet ({id: "evil", immutable_id: "woman", bogus1: "wtf", mobile_phone: "9876543210"});
// w4.save(function(err,savedthing){if(err){"shitSHIT!"} else {console.log("worked") ; console.log(savedthing)}});

// var url = "https://8zjtcatzhf.execute-api.us-west-1.amazonaws.com/dev/wallets";
// request(url, function(error, response, body) {
//     var msgList = [];
//     var walletNewCount = 0;
//     var walletCorruptCount = 0;
//     if(!error && response.statusCode == 200) {
//         var data = JSON.parse(body);
//         var walletRetrievedCount = data.wallets.length;
//         data.wallets.forEach(function(rawWallet,index,array){
//             rawWallet.links.push({href: "http://hamsterporn.com", rel: "self", method: "GET"});
//             rawWallet.links.push({href: "http://gerbilporn.com", rel: "self", method: "GET"});
//             rawWallet.links.push({href: "http://guineapig.porn.com", rel: "self", method: "GET"});
//         });
//         data.wallets.forEach(function(rawWallet,index,array){
//             var keyList = Object.keys(rawWallet);
//             var wallet = new Wallet;
//             keyList.forEach(function(kname,kindex,karray){
//                 wallet[kname] = rawWallet[kname];
//             });
//             Wallet.find({'immutable_id' : wallet.immutable_id}, function(err, retwallet){
//                 if(err){
//                     msgList.push("Error " + err + " querying the database");
//                 }
//                 else
//                 {
//                     if (retwallet.length === 0){
//                         wallet.save(function(err,savedObject){
//                             if(err) {
//                                 msgList.push("Error " + err + " saving wallet with immutable_id " + retwallet.immutable_id);
//                             } else {
//                                 msgList.push("Success saving wallet with immutable_id " + retwallet.immutable_id);
//                                 walletNewCount++;
//                             }
//                         });
//                     }
//                     if (retwallet.length > 1){
//                         msgList.unshift("DATABASE CORRUPTION: more than one wallet found with immutable_id " + retwallet.immutable_id)
                
//                     }

//                 }
//             });
//             console.log("bp3");
//         });
//       msgList.unshift("Saved " + walletNewCount + "new wallets to the database");
//       if(walletCorruptCount > 0) {msgList.unshift("Found " + walletCorruptCount + " corrupted wallets in the database")}
//       msgList.unshift("Retrieved " + walletRetrievedCount + " wallets from spuukee");
//     }
//     else
//     {
//         msgList.push("Failed retrieving wallets from spuukee");
//     }
// });

// console.log("bp");

    // }
    // else
    // {
    //     console.log("error " + response.statusCode + " getting wallets from spuukee");
    // }



    
    
//     wallet.save(function(err,savedObject){
//         if(err) {
//             console.log("shitSHIT!")
//         } else {
//             console.log("\nsaved " + wallet.id + " to the database:\n");
//             console.log(savedObject);
//         }
//     });
// });
    
     



//routes


//home page
app.get("/", function(req, res) {
    res.render("index");
});

//for error/future use
app.get("/walletsCREATE", function(req, res){
   res.render("walletsCREATE");
});
//for error/future use
app.get("/walletsRetrieveCREATE", function(req, res){
   res.render("walletsRetrieveCREATE");
});

//display form to create a new wallet
app.get("/walletsNEW", function(req, res){
    res.render("walletsNEW");
});

//display form to create a new program
app.get("/programsNEW", function(req, res){
    console.log("in get programsNew")
    res.render("programsNEW");
});
    
    //using req.body._id, query the db and get your document back.
    //res.render and send the wallet object to the walletsSHOW page
app.get("/walletsINDEX/:id",function(req,res){
    Wallet.findById(req.params.id, function(err, foundWallet){
        console.log("wallet ID " + req.params.id)
        if(err){
            console.log("Failed getting wallet");
            } else {
            res.render("walletsSHOW",{foundWallet : foundWallet});
        }
    });
});


app.post("/walletsCREATE",function (req, res){
    console.log(req.body);
    console.log(req.body.program_name);
    var wallet = new Wallet({
    mobile_phone : req.body.mobile_phone,
    program_name : req.body.program_name,
    program_owner_name : req.body.program_owner_name,
    program_id : uuid().toUpperCase(),
    id : uuid().toUpperCase(),
    immutable_id : uuid().toUpperCase(),
    user_id : uuid(),
    status : "Demented",
    create_date : Date.now(),
    update_time : Date.now()
    });
    wallet.save(function(err,savedWallet){
        if(err){
            console.log("error saving wallet");
        } else {
            console.log("saved new wallet");
        }
    });
    // var mobile_phone = req.mobile_phone;
    // var program_name = req.program_name;
    // var program_owner_name = req.program_owner_name;
    // var id = uuid();
    // var immutable_id = uuid();
    // var user_id = uuid();
    // var status = "Demented";
    // var create_date = Date.now();
    // var update_time = Date.now();
    // console.log(update_time);
    // console.log(id);
    // console.log(immutable_id);
    
    // wallet.save(function(err,savedObject){
    //                             if(err) {
    //                                 msgList.push("Error " + err + " saving wallet with immutable_id " + wallet.immutable_id);
    //                                 console.log("Error " + err + " saving wallet with immutable_id " + wallet.immutable_id);
    //                             } else {
    //                                 msgList.push("Success saving wallet with immutable_id " + wallet.immutable_id);
    //                                 console.log("Success saving wallet with immutable_id " + wallet.immutable_id);
    //                                 walletNewCount++;
    //                             }
    //                         });
    // res.redirect("walletsINDEX");
    
  res.redirect("walletsINDEX");  
    
});

app.post("/programsCREATE",function (req, res){
    console.log(req.body);
    console.log(req.body.language);
    var idValue = uuid().toUpperCase();
    var program_idValue = uuid().toUpperCase();
    var datesValue = new Date().toISOString();
    var program = new Program({
        name : req.body.name,
        program_owner : req.body.program_owner,
        match_criteria : {language : req.body.language, region : req.body.region},
        program_id : program_idValue,
        id : idValue,
        create_date : datesValue,
        active_date : null,
        update_time : datesValue,
        record_version : 1
    });
    program.save(function(err,savedProgram){
        if(err){
            console.log("error saving program");
        } else {
            // save a new versionTablePrograms entry
            var versionTableProgram = new VersionTableProgram({
                name : req.body.name,
                program_owner : req.body.program_owner,
                match_criteria : {language : req.body.language, region : req.body.region},
                program_id : program_idValue,
                // not putting id and create_date into vt right now--will they really be queried frequently?
                // try adding them later to get a good idea of what kind of fresh hell changing the db schema brings
                //id : idValue,
                //create_date : datesValue,
                active_date : null,
                update_time : datesValue,
                current_version : 1
            });
            versionTableProgram.save(function(err,savedVersionTableProgram){
                if(err){
                   console.log("error saving to versiontable") ;
                }  else {
                    console.log("success saving to versiontable");
                }
            });
        }
    });
  res.redirect("programsINDEX");
});


app.post("/walletsRetrieveCREATE", function(req, res){
    var msgList = [];
    var walletNewCount = 0;
    var walletCorruptCount = 0;
    var walletRetrievedCount = 0;
    var url = "https://8zjtcatzhf.execute-api.us-west-1.amazonaws.com/dev/wallets";
    request(url, function(error, response, body) {
        if(!error && response.statusCode == 200) {
            var data = JSON.parse(body);
            var walletRetrievedCount = data.wallets.length;
            data.wallets.forEach(function(rawWallet,index,array){
                rawWallet.links.push({href: "http://hamsterporn.com", rel: "self", method: "GET"});
                rawWallet.links.push({href: "http://gerbilporn.com", rel: "self", method: "GET"});
                rawWallet.links.push({href: "http://guineapig.porn.com", rel: "self", method: "GET"});
            });
            data.wallets.forEach(function(rawWallet,index,array){
                var keyList = Object.keys(rawWallet);
                var wallet = new Wallet;
                keyList.forEach(function(kname,kindex,karray){
                    wallet[kname] = rawWallet[kname];
                });
                Wallet.find({'immutable_id' : wallet.immutable_id}, function(err, dbWallet){
                    if(err){
                        msgList.push("Error " + err + " querying the database");
                        console.log("Error " + err + " querying the database");
                    }
                    else
                    {
                        if (dbWallet.length === 0){
                            wallet.save(function(err,savedObject){
                                if(err) {
                                    msgList.push("Error " + err + " saving wallet with immutable_id " + wallet.immutable_id);
                                    console.log("Error " + err + " saving wallet with immutable_id " + wallet.immutable_id);
                                } else {
                                    msgList.push("Success saving wallet with immutable_id " + wallet.immutable_id);
                                    console.log("Success saving wallet with immutable_id " + wallet.immutable_id);
                                    walletNewCount++;
                                }
                            });
                        }
                        if (dbWallet.length > 1){
                            msgList.unshift("DATABASE CORRUPTION: more than one wallet found with immutable_id " + dbWallet.immutable_id);
                            console.log("DATABASE CORRUPTION: more than one wallet found with immutable_id " + dbWallet.immutable_id);
                        }
                    }
                });
            });
            res.redirect("walletsINDEX");
        }
        else
        {
            msgList.push("Failed retrieving wallets from spuukee");
            console.log("Failed retrieving wallets from spuukee");
            //res.render("walletsCREATE", {msgList: msgList});
        }
    });
        // msgList.unshift("Saved " + walletNewCount + " new wallets to the database");
        // if(walletCorruptCount > 0) {msgList.unshift("Found " + walletCorruptCount + " corrupted wallets in the database")}
        // msgList.unshift("Retrieved " + walletRetrievedCount + " wallets from spuukee");
        //msgList doesn't work to return logging of what happened for the wallets page.
        //because async callbacks--need to decide on new logging mechanism.
        //res.render("wallets", {msgList: msgList});
 
});




app.get("/walletsINDEX", function(req, res) {
    Wallet.find({}, function(err, walletsFromDB){
        if(err){
            console.log("Error " + err + " querying the database");
        }
        else
        {
            res.render("walletsINDEX", {walletsFromDB : walletsFromDB});
        }
    });
});





app.get("/usersINDEX/:id",function(req,res){
    User.findById(req.params.id, function(err, foundUser){
        console.log("User ID " + req.params.id)
        if(err){
            console.log("Failed getting user");
            } else {
            res.render("usersSHOW",{foundUser : foundUser});
        }
    });
});



app.post("/usersRetrieveCREATE", function(req, res){
    var msgList = [];
    var userNewCount = 0;
    var userCorruptCount = 0;
    var userRetrievedCount = 0;
    var url = "https://8zjtcatzhf.execute-api.us-west-1.amazonaws.com/dev/users";
    request(url, function(error, response, body) {
        if(!error && response.statusCode == 200) {
            var data = JSON.parse(body);
            console.log(data)
            var usersRetrievedCount = data.users.length;
            console.log("count: " + usersRetrievedCount)
            data.users.forEach(function(rawUser,index,array){
                rawUser.links.push({href: "http://hamsterporn.com", rel: "self", method: "GET"});
                rawUser.links.push({href: "http://gerbilporn.com", rel: "self", method: "GET"});
                rawUser.links.push({href: "http://guineapig.porn.com", rel: "self", method: "GET"});
            });
            data.users.forEach(function(rawUser,index,array){
                var keyList = Object.keys(rawUser);
                var user = new User;
                keyList.forEach(function(kname,kindex,karray){
                    user[kname] = rawUser[kname];
                });
                User.find({'id' : user.id}, function(err, dbUser){
                    if(err){
                        msgList.push("Error " + err + " querying the database");
                        console.log("Error " + err + " querying the database");
                    }
                    else
                    {
                        if (dbUser.length === 0){
                            user.save(function(err,savedObject){
                                if(err) {
                                    msgList.push("Error " + err + " saving user with id " + user.id);
                                    console.log("Error " + err + " saving wallet with id " + user.id);
                                } else {
                                    msgList.push("Success saving user with id " + user.id);
                                    console.log("Success saving user with id " + user.id);
                                    userNewCount++;
                                }
                            });
                        }
                        if (dbUser.length > 1){
                            msgList.unshift("DATABASE CORRUPTION: more than one user found with id " + dbUser.id);
                            console.log("DATABASE CORRUPTION: more than one user found with id " + dbUser.id);
                        }
                    }
                });
            });
            res.redirect("usersINDEX");
        }
        else
        {
            msgList.push("Failed retrieving users from spuukee");
            console.log("Failed retrieving users from spuukee");
            //res.render("walletsCREATE", {msgList: msgList});
        }
    });
        // msgList.unshift("Saved " + walletNewCount + " new wallets to the database");
        // if(walletCorruptCount > 0) {msgList.unshift("Found " + walletCorruptCount + " corrupted wallets in the database")}
        // msgList.unshift("Retrieved " + walletRetrievedCount + " wallets from spuukee");
        //msgList doesn't work to return logging of what happened for the wallets page.
        //because async callbacks--need to decide on new logging mechanism.
        //res.render("wallets", {msgList: msgList});
 
});





app.get("/usersINDEX", function(req, res) {
    User.find({}, function(err, usersFromDB){
        if(err){
            console.log("Error " + err + " querying the database");
        }
        else
        {
            res.render("usersINDEX", {usersFromDB : usersFromDB});
        }
    });
});







//broken because returned json isn't an array of programs
app.post("/programsRetrieveCREATE", function(req, res){
    var msgList = [];
    var programNewCount = 0;
    var programCorruptCount = 0;
    var programRetrievedCount = 0;
    var url = "https://8zjtcatzhf.execute-api.us-west-1.amazonaws.com/dev/programs";
    request(url, function(error, response, body) {
        if(!error && response.statusCode == 200) {
            var data = JSON.parse(body);
            console.log(data)
            var programRetrievedCount = data.length;
            data.forEach(function(rawProgram,index,array){
                rawProgram.links.push({href: "http://hamsterporn.com", rel: "self", method: "GET"});
                rawProgram.links.push({href: "http://gerbilporn.com", rel: "self", method: "GET"});
                rawProgram.links.push({href: "http://guineapig.porn.com", rel: "self", method: "GET"});
            });
            data.forEach(function(rawProgram,index,array){
                var keyList = Object.keys(rawProgram);
                var program = new Program;
                keyList.forEach(function(kname,kindex,karray){
                    program[kname] = rawProgram[kname];
                });
                Program.find({'id' : program.id}, function(err, dbProgram){
                    if(err){
                        msgList.push("Error " + err + " querying the database");
                        console.log("Error " + err + " querying the database");
                    }
                    else
                    {
                        if (dbProgram.length === 0){
                            program.save(function(err,savedObject){
                                if(err) {
                                    msgList.push("Error " + err + " saving program with immutable_id " + program.id);
                                    console.log("Error " + err + " saving wallet with immutable_id " + program.id);
                                } else {
                                    msgList.push("Success saving program with id " + program.id);
                                    console.log("Success saving program with id " + program.id);
                                    programNewCount++;
                                }
                            });
                        }
                        if (dbProgram.length > 1){
                            msgList.unshift("DATABASE CORRUPTION: more than one program found with id " + dbProgram.id);
                            console.log("DATABASE CORRUPTION: more than one program found with _id " + dbProgram.id);
                        }
                    }
                });
            });
            res.redirect("programsINDEX")
        }
        else
        {
            msgList.push("Failed retrieving programs from spuukee");
            console.log("Failed retrieving programs from spuukee");
            //res.render("walletsCREATE", {msgList: msgList});
        }
    });
        // msgList.unshift("Saved " + walletNewCount + " new wallets to the database");
        // if(walletCorruptCount > 0) {msgList.unshift("Found " + walletCorruptCount + " corrupted wallets in the database")}
        // msgList.unshift("Retrieved " + walletRetrievedCount + " wallets from spuukee");
        //msgList doesn't work to return logging of what happened for the wallets page.
        //because async callbacks--need to decide on new logging mechanism.
        //res.render("wallets", {msgList: msgList});
 
});



app.get("/programsINDEX", function(req, res){
   Program.find({}, function(err, programsFromDB){
        if(err){
            console.log("Error" + err + "querying the database");
        }
        else
        {
            res.render("programsINDEX", {programsFromDB: programsFromDB});
            
        }
   });
});



app.get("/dcrlist", function(req, res) {
   fs.readFile("dcrlist.txt", "ascii", function(err, data){
        if (err) {console.log("Failed reading dcrlist.txt")}
        var contentLines = data.match(/^.*([\n\r]+|$)/gm);
        res.render("dcrlist", {contentLines: contentLines});
   });
});

app.post("/dcr", function(req, res){
    var dcr = req.body.newdcr;
    console.log("dcr is \"" + dcr + "\"");
    fs.appendFile("dcrlist.txt", dcr + "\r", "ascii",function(err, data){
        if (err) {
            return console.log(err);
        }
    });
    res.redirect("/dcrlist")
});

/*

curl -v -X GET https://api.sandbox.spuukee.com/programs \ -H "x-api-key: Hiorr45VR...c4GJc"

curl -v -X POST https://api.sandbox.spuukee.com/programs \
-H "Content-Type:application/json" \
-d '{
  "name": "Kraken Attack",
  "match_criteria": [
    {
      "language": "EN",
      "region": "US"
    }
  ]
}’'
'

 curl -v -X GET https://3o4aopstyf.execute-api.us-west-1.amazonaws.com/dev/wallets
*/





app.listen(process.env.PORT, process.env.IP, function(){
   console.log("sptest has started");
});
console.log("end of app.js");