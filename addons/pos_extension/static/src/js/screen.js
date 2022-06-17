odoo.define('pos_extension.screens', function (require) {
"use strict";

var pos_screens = require('point_of_sale.screens');
var core = require('web.core');
var rpc = require('web.rpc');
var QWeb = core.qweb;
var utils = require('web.utils');
var field_utils = require('web.field_utils');


pos_screens.PaymentScreenWidget.include({
    payment_input: function(input) {
        var paymentline = this.pos.get_order().selected_paymentline;

        // disable changing amount on paymentlines with running or done payments on a payment terminal
        if (this.payment_interface && !['pending', 'retry'].includes(paymentline.get_payment_status())) {
            return;
        }

        var newbuf = this.gui.numpad_input(this.inputbuffer, input, {'firstinput': this.firstinput});

        this.firstinput = (newbuf.length === 0);

        // popup block inputs to prevent sneak editing.
        if (this.gui.has_popup()) {
            return;
        }

        if (newbuf !== this.inputbuffer) {
            this.inputbuffer = newbuf;
            var order = this.pos.get_order();
            if (paymentline) {
                var amount = this.inputbuffer;

                if (this.inputbuffer !== "-") {
                    amount = field_utils.parse.float(this.inputbuffer);
                }

                if (paymentline.selected == false){
                    paymentline.set_tip_value(amount);
                    this.$('.popup-input.active').text(this.format_currency_no_symbol(amount));
                    this.render_paymentlines();
                }else{
                    paymentline.set_amount(amount);
                    this.render_paymentlines();
                    this.$('.paymentline.selected .edit').text(this.format_currency_no_symbol(amount));
                }
            }
        }
    },
    render_paymentmethods: function() {
            var self = this;
            var order = self.pos.get_order();
            var lines = order.get_paymentlines();
            var methods = $(QWeb.render('PaymentScreen-Paymentmethods', {widget:this,}));
                methods.on('click','.paymentmethod',function(){
                    self.click_paymentmethods($(this).data('id'));
                });
                methods.on('click','.popup-input',function(){
                    for ( var i = 0; i < lines.length; i++ ) {
                        order.unselect_paymentline(lines[i]);
                        self.reset_input();
                        self.render_paymentlines();
                    }
                });
            return methods;
        },
    render_paymentlines: function() {
        var self  = this;
        var order = this.pos.get_order();
        if (!order) {
            return;
        }

        var lines = order.get_paymentlines();
        var extradue = this.compute_extradue(order);

        this.$('.paymentlines-container').empty();
        var lines = $(QWeb.render('PaymentScreen-Paymentlines', {
            widget: this,
            order: order,
            paymentlines: lines,
            extradue: extradue,
        }));

        lines.on('click','.delete-button',function(){
            self.click_delete_paymentline($(this).data('cid'));
        });

        lines.on('click','.paymentline',function(){
            self.click_paymentline($(this).data('cid'));
            order.reselected_paymentline(order.selected_paymentline)
        });

        lines.appendTo(this.$('.paymentlines-container'));

        this.render_payment_terminal();
    },
    compute_extradue: function (order) {
        var lines = order.get_paymentlines();
        var due   = order.get_due();
        if (due && lines.length && (due !== order.get_due(lines[lines.length-1]) || lines[lines.length - 1].payment_status === 'reversed')) {
            for (var i = 0; i < lines.length; i++) {
            due+=lines[i].tip
            }
            return due;
        }
        return 0;
    },
});

pos_screens.ReceiptScreenWidget.include({
render_change: function() {
        var self = this;
        var change = this.pos.get_order().get_change() - this.pos.get_order().get_tip()
        this.$('.change-value').html(this.format_currency(change));
        var order = this.pos.get_order();
        var order_screen_params = order.get_screen_data('params');
        var button_print_invoice = this.$('h2.print_invoice');
        if (order_screen_params && order_screen_params.button_print_invoice) {
            button_print_invoice.show();
        } else {
            button_print_invoice.hide();
        }
    },
});
});
