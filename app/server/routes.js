
var CT = require('./modules/country-list');
var AM = require('./modules/account-manager');
var EM = require('./modules/email-dispatcher');

var ejs = require('ejs');
var paypal = require('paypal-rest-sdk');

paypal.configure({
	'mode': 'sandbox', //sandbox or live
	'client_id': 'AYJDBOV9F6ADQkpjLdFUiS-N5HTq3aCph0fi3NMLnwIWX-FS6iVrQy0nbqCpN5twvtUErsXUCg1tvhj6',
	'client_secret': 'ECd23shcO03CfTo9ztSBtMvgZkd3VmYsNreUK9GTFeC49JAUKbf98Ajnb3mLbZy-JvwlbWC4c2VclNrt'
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
		console.log(req.session.user['user']);
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
											console.log("printtrue");
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
			name 	: req.body['name'],
			email 	: req.body['email'],
			amount 	: req.body['amount'],
			reqAmount	: req.body['reqAmount'],
			withdraw	: true,
			date : req.body['date'],
			cardnumber : req.body['card'],
			payType : req.body['payType']
		}, function(e){
			if (e){
				res.status(400).send(e);
			}	else{
				console.log("Added");
				res.status(200).send('ok');
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
			email : req.body['email'],
			amount 	: req.body['amount']
		}, function(e){
			if (e){
				res.status(400).send(e);
			}	else{
				res.status(200).send('ok');
			}
		});
	});

	app.post('/updateUserWithdraw', function(req, res){
		AM.updateUserWithdraw({
			email : req.body['email'],
			withdraw : req.body['withdraw']
		}, function(e){
			if (e){
				res.status(400).send(e);
			}	else{
				res.status(200).send('ok');
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
				"return_url": "http://localhost:3000/payment",
				"cancel_url": "http://localhost:3000/Un"
			},
			"transactions": [{
				"item_list": {
					"items": [{
						"name": "item",
						"sku": "item",
						"price": "1.00",
						"currency": "USD",
						"quantity": 1
					}]
				},
				"amount": {
					"currency": "USD",
					"total": req.body['amounttm']+""
				},
				"description": "This is the payment description."
			}]
		};
		paypal.payment.create(create_payment_json, function (error, payment) {
			if (error) {
				console.log(error);
				res.redirect('/payment');
			} else {
				console.log(payment);
				for(var i = 0;i < payment.links.length;i++){
					if(payment.links[i].rel === 'approval_url'){
						res.redirect(payment.links[i].href);
					}
				}
			}
		});
	});

};


