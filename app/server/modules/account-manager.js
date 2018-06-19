
var crypto 		= require('crypto');
var MongoDB 	= require('mongodb').Db;
var Server 		= require('mongodb').Server;
var moment 		= require('moment');
var async = require('async');


/*
	ESTABLISH DATABASE CONNECTION
*/

var dbName = process.env.DB_NAME || 'LUDO';
var dbHost = process.env.DB_HOST || 'localhost'
var dbPort = process.env.DB_PORT || 27017;

var db = new MongoDB(dbName, new Server(dbHost, dbPort, {auto_reconnect: true}), {w: 1});
db.open(function(e, d){
	if (e) {
		console.log(e);
	} else {
		if (process.env.NODE_ENV == 'live') {
			db.authenticate(process.env.DB_USER, process.env.DB_PASS, function(e, res) {
				if (e) {
					console.log('mongo :: error: not authenticated', e);
				}
				else {
					console.log('mongo :: authenticated and connected to database :: "'+dbName+'"');
				}
			});
		}	else{
			console.log('mongo :: connected to database :: "'+dbName+'"');
		}
	}
});


var accounts = db.collection('accounts');


/* login validation methods */

exports.autoLogin = function(user, pass, callback)
{
	accounts.findOne({user:user}, function(e, o) {
		if (o){
			o.pass == pass ? callback(o) : callback(null);
		}	else{
			callback(null);
		}
	});
}

exports.manualLogin = function(user, pass, callback)
{
	accounts.findOne({user:user}, function(e, o) {
		if (o == null){
			callback('user-not-found');
		}	else{
			validatePassword(pass, o.pass, function(err, res) {
				if (res){
					callback(null, o);
				}	else{
					callback('invalid-password');
				}
			});
		}
	});
}

/* record insertion, update & deletion methods */

exports.addNewAccount =  function(newData, callback)
{
	accounts.findOne({user:newData.user}, function(e, o) {
		if (o){
			callback('username-taken');
		}	else{
			accounts.findOne({email:newData.email}, function(e, o) {
				if (o){
					callback('email-taken');
				}	else{
					saltAndHash(newData.pass, function(hash){
						newData.pass = hash;
					// append date stamp when record was created //
						newData.date = moment().format('MMMM Do YYYY, h:mm:ss a');
						accounts.insert(newData, {safe: true}, callback);
					});
				}
			});
		}
	});
}

exports.updateAccount =  function(newData, callback)
{
	accounts.findOne({_id:getObjectId(newData.id)}, function(e, o){
		o.name 		= newData.name;
		o.email 	= newData.email;
		o.country 	= newData.country;
		if (newData.pass == ''){
			accounts.save(o, {safe: true}, function(e) {
				if (e) callback(e);
				else callback(null, o);
			});
		}	else{
			saltAndHash(newData.pass, function(hash){
				o.pass = hash;
				accounts.save(o, {safe: true}, function(e) {
					if (e) callback(e);
					else callback(null, o);
				});
			});
		}
	});
}

exports.updatePassword =  function(email, newPass, callback)
{
	accounts.findOne({email:email}, function(e, o){
		if (e){
			callback(e, null);
		}	else{
			saltAndHash(newPass, function(hash){
		        o.pass = hash;
		        accounts.save(o, {safe: true}, callback);
			});
		}
	});
}

/* account lookup methods */

exports.deleteAccount =  function(id, callback)
{
	accounts.remove({_id: getObjectId(id)}, callback);
}

exports.getAccountByEmail =  function(email, callback)
{
	console.log(email);
	accounts.findOne({email:email}, function(e, o){ callback(o); });
}

exports.validateResetLink =  function(email, passHash, callback)
{
	accounts.find({ $and: [{email:email, pass:passHash}] }, function(e, o){
		callback(o ? 'ok' : null);
	});
}

exports.getAllRecords =   function(callback)
{
	accounts.find().toArray(
		function(e, res) {
		if (e) callback(e)
		else callback(null, res)
	});
}

exports.delAllRecords =  function(callback)
{
	accounts.remove({}, callback); // reset accounts collection for testing //
}
exports.getAccountAmount = function (a,callback) {
	accounts.find({user:a.user}).toArray(
		function(e, res) {
			if (e) callback(e)
			else callback(null, res[0].amount)
		});
}

exports.updateAccountAmount =  function (a,callback) {
	var myquery = { user: 'admin' };
	accounts.findOne(myquery,
		function(e, res) {
			if (e) callback(e)
			else {

				var amount = parseFloat(a.amount)+parseFloat(res.amount);
				var newvalues = { $set: {amount: amount,currency:a.currency} };
				accounts.updateOne(myquery, newvalues, function(e, result) {
					if (e) callback(e)
					else {
						callback(null,result);
					}
				});
			}
		});

}

/* private encryption & validation methods */

var generateSalt = function()
{
	var set = '0123456789abcdefghijklmnopqurstuvwxyzABCDEFGHIJKLMNOPQURSTUVWXYZ';
	var salt = '';
	for (var i = 0; i < 10; i++) {
		var p = Math.floor(Math.random() * set.length);
		salt += set[p];
	}
	return salt;
}

var md5 = function(str) {
	return crypto.createHash('md5').update(str).digest('hex');
}

var saltAndHash = function(pass, callback)
{
	var salt = generateSalt();
	callback(salt + md5(pass + salt));
}

var validatePassword = function(plainPass, hashedPass, callback)
{
	var salt = hashedPass.substr(0, 10);
	var validHash = salt + md5(plainPass + salt);
	callback(null, hashedPass === validHash);
}

var getObjectId = function(id)
{
	return new require('mongodb').ObjectID(id);
}

var findById = function(id, callback)
{
	accounts.findOne({_id: getObjectId(id)},
		function(e, res) {
		if (e) callback(e)
		else callback(null, res)
	});
}


var users = db.collection('users');



exports.addNewUser =  function(newData, callback)
{
    var myquery = {id: newData.id};
    users.findOne(myquery,
        function (e, res) {
            if (e) callback(e)
            else {
                console.log(res);
                if(newData.name!=null&&newData.id!=null&&res==null) {

                    // append date stamp when record was created //
                    newData.date = moment().format('MMMM Do YYYY');
                    users.insert(newData, {safe: true}, callback);

                }
                else{
					var newvalues = {$set: {id: newData.id,name:newData.name}};
					users.updateOne(myquery, newvalues, function (e, result) {
						if (e) callback(e)
						else {
							callback(null, "success");
						}
					});
				}
            }
        });


}

exports.userLogin =  function(a, callback)
{
	var myquery = {id: a.id};
	users.findOne(myquery,
		function (e, res) {
			if (e) callback(e)
			else {

				callback(null,res);
			}
		});

}

exports.findUsers =   function(a,callback)
{

	users.find({'withdraw':true}).toArray(
		function(e, results) {
			if (e) callback(e)
			else callback(null,results)
		});
}
exports.countUsers =  function(a,callback)
{
	users.count(
		function(e, results) {
			if (e) callback(e)
			else callback(null,results)
		});
}
exports.countReqUsers =  function(a,callback)
{
	users.find({'withdraw':true}).count(
		function(e, results) {
			if (e) callback(e)
			else callback(null,results)
		});
}

exports.updateUserAmount =  function (a,callback) {
    console.log(a);
	if(a.id!=null) {
		var myquery = {id: a.id,payID : a.payID};
		users.findOne(myquery,
			function (e, res) {
				if (e||res==null) callback(null,"failed")
				else {

					var amount = parseInt(a.amount) + parseInt(res.amount);
					var newvalues = {$set: {amount: amount,payID : Math.random()}};
					users.updateOne(myquery, newvalues, function (e, result) {
						if (e) callback(e)
						else {
							callback(null, "success");
						}
					});
				}
			});
	}
	else callback('failed');

}



exports.updateUserAmountID =  function (a,callback) {
    console.log(a);
    if(a.id!=null) {
        var myquery = {id: a.id};
        users.findOne(myquery,
            function (e, res) {
                if (e) callback(e)
                else {
                    var newvalues = {$set: {payID: a.payID}};
                    users.updateOne(myquery, newvalues, function (e, result) {
                        if (e) callback(e)
                        else {
                            callback(null, result);
                        }
                    });
                }
            });
    }
    else callback('failed');

}

exports.getUserAmount =   function (a,callback) {
    if(a.id!=null) {
        var myquery = {id: a.id};
        users.findOne(myquery,
            function (e, res) {
                if (e) callback(e)
                else {
                    callback(null,res);
                }
            });
    }
    else callback('failed');

}

exports.getWithdrawalStatus =  function (a,callback) {
    if(a.id!=null) {
        var myquery = {id: a.id};
        users.findOne(myquery,
            function (e, res) {
                if (e) callback(e)
                else {
                    callback(null,res);
                }
            });
    }
    else callback('failed');

}

exports.withdrawrequest =  function (a,callback) {
    if(a.id!=null) {
        var myquery = {id: a.id};
        users.findOne(myquery,
            function (e, res) {
                if (e) callback(e)
                else {
                    var newvalues = {$set: {type: a.type,reqAmount:a.reqAmount,payType : a.payType,withdraw: true,freeze:false,amount:a.amount,currency:a.currency}};
                    users.updateOne(myquery, newvalues, function (e, result) {
                        if (e) callback(e)
                        else {
                            callback(null, result);
                        }
                    });
                }
            });
    }
    else callback('failed');

}

exports.updateUserWithdraw =  function (a,callback) {
	console.log(a);
	if(a.id!=null) {
		var myquery = {id: a.id};
		users.findOne(myquery,
			function (e, res) {
				if (e) callback(e)
				else {
					var amount = parseInt(res.amount) - parseInt(a.reqamount);
					if (amount < 0) {
						callback('request amount is greater than current amount');
					}
					else {
						var newvalues = {$set: {withdraw: a.withdraw, amount: amount, reqAmount: 0,freeze:false}};
						users.updateOne(myquery, newvalues, function (e, result) {
							if (e) callback(e)
							else {
								callback(null, result);
							}
						});
					}
				}
			});
	}

	else callback('failed');

}


exports.freezeRequest =   function (a,callback) {
	console.log(a);
	if(a.id!=null) {
		var myquery = {id: a.id,reqAmount:a.amount};
		users.findOne(myquery,
			function (e, res) {
				if (e) callback(e)
				else {

						var newvalues = {$set: {freeze:a.freeze}};
						users.updateOne(myquery, newvalues, function (e, result) {
							if (e) callback(e)
							else {
								callback(null, result);
							}
						});
					}

			});
	}

	else callback('failed');

}





var findByMultipleFields =  function(a, callback)
{
// this takes an array of name/val pairs to search against {fieldName : 'value'} //
	accounts.find( { $or : a } ).toArray(
		function(e, results) {
		if (e) callback(e)
		else callback(null, results)
	});
}




