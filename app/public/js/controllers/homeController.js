
function HomeController()
{

	//credit Card payment

// bind event listeners to button clicks //
	var that = this;
	/*
	$('#btn-payment').click(function(){ that.paymentFunction(); });

	this.paymentFunction = function()
	{
		//console.log("print");
		var that = this;
		$.ajax({
			url: "/payment",
			type: "GET",
			data : {title:true},
			success: function(data){
				//console.log("print");
				window.location.href = '/payment'
			},
			error: function(jqXHR){
				console.log(jqXHR.responseText+' :: '+jqXHR.statusText);
			}
		});
	}
	*/

	$('#btn-payment').click(function(){
		console.log("print");
		//$('#label').html($('#btn-payment').children().val());
		$('#cancel').html('Cancel');
		$('#retrieve-paypal-submit').show();
		$('#get-paypal').modal('show');
	});

	$("#myTable td").click(function() {

		var column_num = parseInt( $(this).index() ) + 1;
		var row_num = parseInt( $(this).parent().index() )+1;

		$("#result").html( "Row_num =" + row_num + "  ,  Rolumn_num ="+ column_num );
		if(column_num==8){
			//$('#label').html($(id).val());
			$('#cancel').html('Cancel');
			$('#retrieve-paypal-submit').show();
			$('#get-paypal').modal('show');
		}
	});

// handle user logout //
	$('#btn-logout').click(function(){ that.attemptLogout(); });


	this.deleteAccount = function()
	{
		$('.modal-confirm').modal('hide');
		var that = this;
		$.ajax({
			url: '/delete',
			type: 'POST',
			data: { id: $('#userId').val()},
			success: function(data){
	 			that.showLockedAlert('Your account has been deleted.<br>Redirecting you back to the homepage.');
			},
			error: function(jqXHR){
				console.log(jqXHR.responseText+' :: '+jqXHR.statusText);
			}
		});
	}

	this.attemptLogout = function()
	{
		var that = this;
		$.ajax({
			url: "/logout",
			type: "POST",
			data: {logout : true},
			success: function(data){
	 			that.showLockedAlert('You are now logged out.<br>Redirecting you back to the homepage.');
			},
			error: function(jqXHR){
				console.log(jqXHR.responseText+' :: '+jqXHR.statusText);
			}
		});
	}

	this.showLockedAlert = function(msg){
		$('.modal-alert').modal({ show : false, keyboard : false, backdrop : 'static' });
		$('.modal-alert .modal-header h4').text('Success!');
		$('.modal-alert .modal-body p').html(msg);
		$('.modal-alert').modal('show');
		$('.modal-alert button').click(function(){window.location.href = '/';})
		setTimeout(function(){window.location.href = '/';}, 3000);
	}
}

HomeController.prototype.onUpdateSuccess = function()
{
	$('.modal-alert').modal({ show : false, keyboard : true, backdrop : true });
	$('.modal-alert .modal-header h4').text('Success!');
	$('.modal-alert .modal-body p').html('Your account has been updated.');
	$('.modal-alert').modal('show');
	$('.modal-alert button').off('click');
}
