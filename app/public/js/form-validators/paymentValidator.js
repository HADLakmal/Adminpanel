
function PaytmValidator()
{
// bind a simple alert window to this controller to display any errors //
    this.loginErrors = $('.modal-alert');

    this.showLoginError = function(t, m)
    {
        $('.modal-alert .modal-header h4').text(t);
        $('.modal-alert .modal-body').html(m);
        this.loginErrors.modal('show');


    }

    var that = this;

    $('#btn-paytm').click(function(){ that.paymentFunction(); });

    this.paymentFunction = function()
    {
        print("print");
        var that = this;
        $.ajax({
            url: "/generate",
            type: "POST",
            data : {title:true},
            success: function(data){

                window.location.href = '/payment/paymentCredit'
            },
            error: function(jqXHR){
                console.log(jqXHR.responseText+' :: '+jqXHR.statusText);
            }
        });
    }
}