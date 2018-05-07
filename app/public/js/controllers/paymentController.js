/**
 * Created by Damindu on 5/7/2018.
 */
function PaymentController(){

    var that = this;

    $('#btn-pay').click(function(){ that.paymentFunction(); });

    this.paymentFunction = function()
    {
        console.log("print");
        var that = this;
        $.ajax({
            url: "/payment/paymentCredit",
            type: "GET",
            data : {title:true},
            success: function(data){
                //console.log("print");
                window.location.href = '/payment/paymentCredit'
            },
            error: function(jqXHR){
                console.log(jqXHR.responseText+' :: '+jqXHR.statusText);
            }
        });
    }
}