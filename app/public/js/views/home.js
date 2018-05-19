
$(document).ready(function(){

	var hc = new HomeController();
	var av = new AccountValidator();
	
	$('#account-form').ajaxForm({
		beforeSubmit : function(formData, jqForm, options){
			if (av.validateForm() == false){
				return false;
			} 	else{
			// push the disabled username field onto the form data array //
				formData.push({name:'user', value:$('#user-tf').val()})
				return true;
			}
		},
		success	: function(responseText, status, xhr, $form){
			if (status == 'success') hc.onUpdateSuccess();
		},
		error : function(e){
			if (e.responseText == 'email-taken'){
				av.showInvalidEmail();
			}	else if (e.responseText == 'username-taken'){
				av.showInvalidUserName();
			}
		}
	});
	$('#name-tf').focus();

// customize the account settings form //
	


// setup the confirm window that displays when the user chooses to delete their account //



	// $('#get-paypal-form').ajaxForm({
	// 	url : '/updateUserWithdraw',
	// 	beforeSubmit : function(formData, jqForm, options){
	// 		if ($('#email-tf').val()==''){
	// 			return false;
	// 		}	else{
	// 			return true;
	// 		}
	// 	},
	// 	success	: function(responseText, status, xhr, $form){
    //
	// 	},
	// 	error : function(e){
	// 		console.log("error");
	// 	}
    //
	// });

});
