
function PaypalValidator()
{
// bind a simple alert window to this controller to display any errors //
    this.loginErrors = $('.modal-alert');

    this.showLoginError = function(t, m)
    {
        $('.modal-alert .modal-header h4').text(t);
        $('.modal-alert .modal-body').html(m);
        this.loginErrors.modal('show');
    }
    if ($('#am-pay').val() == ''){
        this.showLoginError('Whoops!', 'Please enter a valid amount');
        return false;
    }	else{
        return true;
    }
}