
var CT = require('./modules/country-list');
var AM = require('./modules/account-manager');
var EM = require('./modules/email-dispatcher');

var ejs = require('ejs');
var paypal = require('paypal-rest-sdk');
var  Paytm = require('paytm-sdk');

var paytm_config = require('./paytm/paytm_config').paytm_config;
var paytm_checksum = require('./paytm/checksum');


paypal.configure({
	'mode': 'sandbox', //sandbox or live
	'client_id': 'AYJDBOV9F6ADQkpjLdFUiS-N5HTq3aCph0fi3NMLnwIWX-FS6iVrQy0nbqCpN5twvtUErsXUCg1tvhj6',
	'client_secret': 'ECd23shcO03CfTo9ztSBtMvgZkd3VmYsNreUK9GTFeC49JAUKbf98Ajnb3mLbZy-JvwlbWC4c2VclNrt'
});

const paytm = new Paytm('<merchantkey>', {
    generateRoute: '/checksum/generate',
    verifyRoute: '/checksum/verify',
    handleError: false
});

module.exports = function(app) {

// main login page //
	app.get('/', function(req, res){
	// check if the user's credentials are saved in a cookie //
		if (req.cookies.user == undefined || req.cookies.pass == undefined){
			res.render('login', { title: 'Hello - Please Login To Your Account' });
		}	else{
	// attempt automatic login //
			AM.autoLogin(req.cookies.user, req.cookies.pass, function(o){
				if (o != null){
				    req.session.user = o;
					res.redirect('/home');
				}	else{
					res.render('login', { title: 'Hello - Please Login To Your Account' });
				}
			});
		}
	});
	
	app.post('/', function(req, res){
		AM.manualLogin(req.body['user'], req.body['pass'], function(e, o){
			if (!o){
				res.status(400).send(e);
			}	else{
				req.session.user = o;
				if (req.body['remember-me'] == 'true'){
					res.cookie('user', o.user, { maxAge: 900000 });
					res.cookie('pass', o.pass, { maxAge: 900000 });
				}
				res.status(200).send(o);
			}
		});
	});

	//Payement
	app.get('/payment', function (req, res) {
		return res.render('payment');
	});

	//Credit Payment

	app.get('/paymentCredit', function (req, res) {
		console.log("print");
		return res.render('credit');
	});

// logged-in user homepage //
	
	app.get('/home', function(req, res) {
		if (req.session.user == null){
	// if user is not logged-in redirect back to login page //
			res.redirect('/');
		}	else{

			AM.findUsers({
			}, function(e, o){
				if (e){

					res.status(400).send('error-finding the users');
				}	else{
					AM.countUsers({
					}, function(e, count){
						if (e){

							res.status(400).send('error-finding the users');
						}else{
							AM.countReqUsers({
							}, function(e, reqCount){
								if (e){

									res.status(400).send('error-finding the users');
								}else{
									AM.getAccountAmount({user : req.session.user['user']}, function(e, amount){
										if (e){

											res.status(400).send('error-finding the users');
										}else{
											res.render('home', {
												title : 'Control Panel',
												countries : CT,
												udata : req.session.user,
												results : o,
												count : count,
												reqCount : reqCount,
												amount : amount
											});
										}
									});
								}
							});

						}
					});

				}
			});

		}
	});
	
	app.post('/home', function(req, res){
		console.log("post");
		if (req.session.user == null){
			res.redirect('/');
		}	else{
			AM.updateAccount({
				id		: req.session.user._id,
				name	: req.body['name'],
				email	: req.body['email'],
				pass	: req.body['pass'],
				country	: req.body['country']
			}, function(e, o){
				if (e){
					res.status(400).send('error-updating-account');
				}	else{
					req.session.user = o;
			// update the user's login cookies if they exists //
					if (req.cookies.user != undefined && req.cookies.pass != undefined){
						res.cookie('user', o.user, { maxAge: 900000 });
						res.cookie('pass', o.pass, { maxAge: 900000 });	
					}
					//get user details

					res.status(200).send('ok');
				}
			});
		}
	});

	app.post('/logout', function(req, res){
		res.clearCookie('user');
		res.clearCookie('pass');
		req.session.destroy(function(e){ res.status(200).send('ok'); });
	})
	
// creating new accounts //
	
	app.get('/signup', function(req, res) {
		res.render('signup', {  title: 'Signup', countries : CT });
	});
	
	app.post('/signup', function(req, res){
		AM.addNewAccount({
			name 	: req.body['name'],
			email 	: req.body['email'],
			user 	: req.body['user'],
			pass	: req.body['pass'],
			country : req.body['country'],
			amount : 0
		}, function(e){
			if (e){
				res.status(400).send(e);
			}	else{
				res.status(200).send('ok');
			}
		});
	});

// password reset //

	app.post('/lost-password', function(req, res){
	// look up the user's account via their email //
		AM.getAccountByEmail(req.body['email'], function(o){
			if (o){
				EM.dispatchResetPasswordLink(o, function(e, m){
				// this callback takes a moment to return //
				// TODO add an ajax loader to give user feedback //
					if (!e){
						res.status(200).send('ok');
					}	else{
						for (k in e) console.log('ERROR : ', k, e[k]);
						res.status(400).send('unable to dispatch password reset');
					}
				});
			}	else{
				res.status(400).send('email-not-found');
			}
		});
	});

	app.get('/reset-password', function(req, res) {
		var email = req.query["e"];
		var passH = req.query["p"];
		AM.validateResetLink(email, passH, function(e){
			if (e != 'ok'){
				res.redirect('/');
			} else{
	// save the user's email in a session instead of sending to the client //
				req.session.reset = { email:email, passHash:passH };
				res.render('reset', { title : 'Reset Password' });
			}
		})
	});
	
	app.post('/reset-password', function(req, res) {
		var nPass = req.body['pass'];
	// retrieve the user's email from the session to lookup their account and reset password //
		var email = req.session.reset.email;
	// destory the session immediately after retrieving the stored email //
		req.session.destroy();
		AM.updatePassword(email, nPass, function(e, o){
			if (o){
				res.status(200).send('ok');
			}	else{
				res.status(400).send('unable to update password');
			}
		})
	});
	//sign UP

	app.get('/signup', function(req, res) {
		res.render('signup', {  title: 'Signup', countries : CT });
	});

	app.post('/signup', function(req, res){
		AM.addNewAccount({
			name 	: req.body['name'],
			email 	: req.body['email'],
			user 	: req.body['user'],
			pass	: req.body['pass'],
			country : req.body['country']
		}, function(e){
			if (e){
				res.status(400).send(e);
			}	else{
				res.status(200).send('ok');
			}
		});
	});
// view & delete accounts //
	
	app.get('/print', function(req, res) {
		AM.getAllRecords( function(e, accounts){
			res.render('print', { title : 'Account List', accts : accounts });
		})
	});
	
	app.post('/delete', function(req, res){
		AM.deleteAccount(req.body.id, function(e, obj){
			if (!e){
				res.clearCookie('user');
				res.clearCookie('pass');
				req.session.destroy(function(e){ res.status(200).send('ok'); });
			}	else{
				res.status(400).send('record not found');
			}
	    });
	});
	
	app.get('/reset', function(req, res) {
		AM.delAllRecords(function(){
			res.redirect('/print');	
		});
	});
	
	app.get('*', function(req, res) { res.render('404', { title: 'Page Not Found'}); });



//User Account

	app.post('/userAdd', function(req, res){
		AM.addNewUser({
		    id      : req.body["id"],
			name 	: req.body['name'],
			type 	: req.body['type'],
			amount 	: req.body['amount'],
			reqAmount	: req.body['reqAmount'],
			withdraw	: false,
			date : req.body['date'],
			cardnumber : req.body['card'],
			payType : req.body['payType']
		}, function(e,response){
			if (e){
				res.status(400).send(e);
			}	else{
                if(response!=null)
                    res.status(200).send('ok');
                else res.status(400).send("failed");
			}
		});
	});
    app.post('/userLogin', function(req, res){
        AM.userLogin({
            id      : req.body["id"]
        }, function(e,response){
            if (e){
                res.status(400).send(e);
            }	else{
                if(response!=null)
                res.status(200).send('ok');
                else res.status(400).send("failed");
            }
        });
    });
	app.post('/updateAccountAmount', function(req, res){
		AM.updateAccountAmount({
			amount 	: req.body['amount'],
		}, function(e){
			if (e){
				res.status(400).send(e);
			}	else{
				res.status(200).send('ok');
			}
		});
	});
	app.post('/updateUserAmount', function(req, res){
		AM.updateUserAmount({
			id : req.body['id'],
			amount 	: req.body['amount']
		}, function(e){
			if (e){
				res.status(400).send(e);
			}	else{
				res.status(200).send('ok');
			}
		});
	});

    app.post('/getUserAmount', function(req, res){
        AM.getUserAmount({
            id : req.body['id']
        }, function(e,response){
            if (e){
                res.status(400).send(e);
            }	else {
                var amount = response.amount;
                if (response != null){
                    res.status(200).send(amount+"");
                }else res.status(400).send("failed");
            }
        });
    });

	app.post('/updateUserWithdraw', function(req, res){
		AM.updateUserWithdraw({
			id : req.body['id'],
			withdraw : req.body['withdraw']
		}, function(e){
			if (e){
				res.status(400).send(e);
			}	else{
				res.status(200).send('ok');
			}
		});
	});
    app.post('/getWithdrawStatus', function(req, res){
        AM.getWithdrawalStatus({
            id : req.body['id']
        }, function(e,response){
            if (e){
                res.status(400).send(e);
            }	else{
                if(res!=null)
                res.status(200).send(response.withdraw);
                else res.status(400).send('failed');
            }
        });
    });
    app.post('/withdrawRequest', function(req, res){
        AM.withdrawrequest({
            id : req.body['id'],
            type 	: req.body['type'],
            reqAmount 	: req.body['reqAmount'],
            payType	: req.body['payType']
        }, function(e,response){
            if (e){
                res.status(400).send(e);
            }	else{
                if(response!=null)
                    res.status(200).send('OK');
                else
                    res.status(400).send('failed');
            }
        });
    });

	//Paypal
	app.post('/paypal',function (req,res) {

		var create_payment_json = {
			"intent": "sale",
			"payer": {
				"payment_method": "paypal"
			},
			"redirect_urls": {
				"return_url": "http://139.59.6.58:3000/payment",
				"cancel_url": "http://139.59.6.58:3000/Un"
			},
			"transactions": [{
				"item_list": {
					"items": [{
						"name": "item",
						"sku": "item",
						"price": req.body['amountpay'],
						"currency": "USD",
						"quantity": 1
					}]
				},
				"amount": {
					"currency": "USD",
					"total": req.body['amountpay']
				},
				"description": "This is the payment description."
			}]
		};
		paypal.payment.create(create_payment_json, function (error, payment) {
			if (error) {
				console.log(error);
				res.status(400).send('fail');

			} else {
                AM.updateUserAmount({
                    id : req.body['id'],
                    amount : req.body['amountpay']
                }, function(e){
                    if (e){
                        res.status(400).send(e);
                    }	else{
                        for(var i = 0;i < payment.links.length;i++){
                            if(payment.links[i].rel === 'approval_url'){
                                //res.redirect(payment.links[i].href);
                                res.status(200).send(payment.links[i].href);
                            }
                        }
                    }
                });

			}
		});
	});




	app.post('/generate',function (request,response) {
		console.log(request.body['amounttm']);
		if(request.body['amounttn']=='') response.status(400).send("fail");
		else {
			var paramarray = {};
			paramarray['MID'] = 'LUDOKI60043050694862'; //Provided by Paytm
			paramarray['ORDER_ID'] = 'ORDER000'; //unique OrderId for every request
			paramarray['CUST_ID'] = 'CUST00';  // unique customer identifier
			paramarray['INDUSTRY_TYPE_ID'] = 'Retail'; //Provided by Paytm
			paramarray['CHANNEL_ID'] = 'WAP'; //Provided by Paytm
			paramarray['TXN_AMOUNT'] = request.body['amounttm']+""; // transaction amount
			paramarray['WEBSITE'] = 'WEB_STAGING'; //Provided by Paytm
			paramarray['CALLBACK_URL'] = 'https://pguat.paytm.com/paytmchecksum/paytmCallback.jsp';//Provided by Paytm
			paramarray['EMAIL'] = 'abc@gmail.com'; // customer email id
			paramarray['MOBILE_NO'] = '7777777777'; // customer 10 digit mobile no.
			paytm_checksum.genchecksum(paramarray, paytm_config.MERCHANT_KEY, function (err, res) {
				if (err) {
					console.log(error);
					response.status(400).send("fail");
				} else {
                    AM.updateUserAmount({
                        id : req.body['id'],
                        amount : req.body['amounttn']
                    }, function(e) {
                        if (e) {
                            res.status(400).send(e);
                        } else {

                            response.status(200).send('https://securegw-stage.paytm.in/theia/processTransaction?jsondata=' + JSON.stringify(res));
                        }
                    });
				}
			});
		}
	});

	app.post('/verify_checksum',function (req,res) {
		var fullBody = '';
		req.on('data', function(chunk) {
			fullBody += chunk.toString();
			console.log(fullBody);
		});
		req.on('end', function() {
			var decodedBody = querystring.parse(fullBody);
			res.writeHead(200, {'Content-type' : 'text/html','Cache-Control': 'no-cache'});
			if(paytm_checksum.verifychecksum(decodedBody, paytm_config.MERCHANT_KEY)) {
				console.log("true");
			}else{
				console.log("false");
			}
			// if checksum is validated Kindly verify the amount and status
			// if transaction is successful
			// kindly call Paytm Transaction Status API and verify the transaction amount and status.
			// If everything is fine then mark that transaction as successful into your DB.

			res.end();
		});
	});





};


