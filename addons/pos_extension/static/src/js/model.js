odoo.define('pos_extension.models', function (require) {
    "use strict";

    var models = require('point_of_sale.models');

    var utils = require('web.utils');
    var round_di = utils.round_decimals;
    var round_pr = utils.round_precision;
    var core = require('web.core');
    var _t = core._t;

    var exports = {};

    models.Order = models.Order.extend({
        reselected_paymentline: function(line){
            if(this.selected_paymentline){
                this.selected_paymentline.set_selected(true);
            }
        },
        unselect_paymentline: function(line){
            if(this.selected_paymentline){
                this.selected_paymentline.set_selected(false);
            }
        },
        get_change_value: function(paymentline) {
            if (!paymentline) {
                var change = this.get_total_paid() - this.get_total_with_tax();
            } else {
                var change = -this.get_total_with_tax();
                var lines  = this.paymentlines.models;
                for (var i = 0; i < lines.length; i++) {
                    change += lines[i].get_amount() - lines[i].tip;
                    if (lines[i] === paymentline) {
                        break;
                    }
                }
            }
            return round_pr(change, this.pos.currency.rounding)
        },
        get_tip_value: function(paymentline) {
        	var tip = 0.0
            var lines  = this.paymentlines.models;
            for (var i = 0; i < lines.length; i++) {
                tip += lines[i].tip;
                if (lines[i] === paymentline) {
                    break;
                }
            }
	        return round_pr(tip, this.pos.currency.rounding)
	    },
	    get_tip: function(paymentline) {
	        var tip = this.get_tip_value(paymentline);
	        return Math.max(0,tip);
	    },
	    export_as_JSON: function() {
	        var orderLines, paymentLines;
	        orderLines = [];
	        this.orderlines.each(_.bind( function(item) {
	            return orderLines.push([0, 0, item.export_as_JSON()]);
	        }, this));
	        paymentLines = [];
	        this.paymentlines.each(_.bind( function(item) {
	            return paymentLines.push([0, 0, item.export_as_JSON()]);
	        }, this));
	        var json = {
	            name: this.get_name(),
	            amount_paid: this.get_total_paid() - this.get_change() - this.get_tip(),
	            amount_total: this.get_total_with_tax(),
	            amount_tax: this.get_total_tax(),
	            amount_return: this.get_change()-this.get_tip(),
	            tip: this.get_tip(),
	            lines: orderLines,
	            statement_ids: paymentLines,
	            pos_session_id: this.pos_session_id,
	            pricelist_id: this.pricelist ? this.pricelist.id : false,
	            partner_id: this.get_client() ? this.get_client().id : false,
	            user_id: this.pos.user.id,
	            employee_id: this.pos.get_cashier().id,
	            uid: this.uid,
	            sequence_number: this.sequence_number,
	            creation_date: this.validation_date || this.creation_date, // todo: rename creation_date in master
	            fiscal_position_id: this.fiscal_position ? this.fiscal_position.id : false,
	            server_id: this.server_id ? this.server_id : false,
	            to_invoice: this.to_invoice ? this.to_invoice : false,
	        };
	        if (!this.is_paid && this.user_id) {
	            json.user_id = this.user_id;
	        }
	        return json;
	    },
	    export_for_printing: function(){
	        var orderlines = [];
	        var self = this;

	        this.orderlines.each(function(orderline){
	            orderlines.push(orderline.export_for_printing());
	        });

	        var paymentlines = [];
	        this.paymentlines.each(function(paymentline){
	            paymentlines.push(paymentline.export_for_printing());
	        });
	        var client  = this.get('client');
	        var cashier = this.pos.get_cashier();
	        var company = this.pos.company;
	        var date    = new Date();

	        function is_html(subreceipt){
	            return subreceipt ? (subreceipt.split('\n')[0].indexOf('<!DOCTYPE QWEB') >= 0) : false;
	        }

	        function render_html(subreceipt){
	            if (!is_html(subreceipt)) {
	                return subreceipt;
	            } else {
	                subreceipt = subreceipt.split('\n').slice(1).join('\n');
	                var qweb = new QWeb2.Engine();
	                    qweb.debug = config.isDebug();
	                    qweb.default_dict = _.clone(QWeb.default_dict);
	                    qweb.add_template('<templates><t t-name="subreceipt">'+subreceipt+'</t></templates>');

	                return qweb.render('subreceipt',{'pos':self.pos,'widget':self.pos.chrome,'order':self, 'receipt': receipt}) ;
	            }
	        }

	        var receipt = {
	            orderlines: orderlines,
	            paymentlines: paymentlines,
	            subtotal: this.get_subtotal(),
	            total_with_tax: this.get_total_with_tax(),
	            total_without_tax: this.get_total_without_tax(),
	            total_tax: this.get_total_tax(),
	            total_paid: this.get_total_paid(),
	            total_discount: this.get_total_discount(),
	            tax_details: this.get_tax_details(),
	            change: this.get_change() - this.get_tip(),
	            name : this.get_name(),
	            client: client ? client.name : null ,
	            invoice_id: null,   //TODO
	            cashier: cashier ? cashier.name : null,
	            precision: {
	                price: 2,
	                money: 2,
	                quantity: 3,
	            },
	            date: {
	                year: date.getFullYear(),
	                month: date.getMonth(),
	                date: date.getDate(),       // day of the month
	                day: date.getDay(),         // day of the week
	                hour: date.getHours(),
	                minute: date.getMinutes() ,
	                isostring: date.toISOString(),
	                localestring: this.formatted_validation_date,
	            },
	            company:{
	                email: company.email,
	                website: company.website,
	                company_registry: company.company_registry,
	                contact_address: company.partner_id[1],
	                vat: company.vat,
	                vat_label: company.country && company.country.vat_label || _t('Tax ID'),
	                name: company.name,
	                phone: company.phone,
	                logo:  this.pos.company_logo_base64,
	            },
	            currency: this.pos.currency,
	        };

	        if (is_html(this.pos.config.receipt_header)){
	            receipt.header = '';
	            receipt.header_html = render_html(this.pos.config.receipt_header);
	        } else {
	            receipt.header = this.pos.config.receipt_header || '';
	        }

	        if (is_html(this.pos.config.receipt_footer)){
	            receipt.footer = '';
	            receipt.footer_html = render_html(this.pos.config.receipt_footer);
	        } else {
	            receipt.footer = this.pos.config.receipt_footer || '';
	        }

	        return receipt;
	    },
    });
});