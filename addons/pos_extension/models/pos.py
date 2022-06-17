from odoo import api, fields, models, _
from odoo.tools import float_is_zero
from odoo.exceptions import UserError

class PosPayment(models.Model):
    _inherit = 'pos.payment'
    _description = 'Pos Payment'

    tip = fields.Float('Tip')

class PosOrder(models.Model):
    _inherit = 'pos.order'
    _description = 'Pos Order'

    def cancel_order(self):
        self.refund()
        self.state = 'cancel'
        return self.env['pos.order'].search([('state','=','done')])


    def _process_payment_lines(self, pos_order, order, pos_session, draft):
        """Create account.bank.statement.lines from the dictionary given to the parent function.

        If the payment_line is an updated version of an existing one, the existing payment_line will first be
        removed before making a new one.
        :param pos_order: dictionary representing the order.
        :type pos_order: dict.
        :param order: Order object the payment lines should belong to.
        :type order: pos.order
        :param pos_session: PoS session the order was created in.
        :type pos_session: pos.session
        :param draft: Indicate that the pos_order is not validated yet.
        :type draft: bool.
        """
        prec_acc = order.pricelist_id.currency_id.decimal_places

        order_bank_statement_lines = self.env['pos.payment'].search([('pos_order_id', '=', order.id)])
        order_bank_statement_lines.unlink()
        for payments in pos_order['statement_ids']:
            if not float_is_zero(payments[2]['amount'], precision_digits=prec_acc):
                print ('it is working here then')
                order.add_payment(self._payment_fields(order, payments[2],pos_order['tip']))

        order.amount_paid = sum(order.payment_ids.mapped('amount'))

        print('what it is not working',pos_order['tip'])

        if not draft and not float_is_zero(pos_order['amount_return'], prec_acc):
            cash_payment_method = pos_session.payment_method_ids.filtered('is_cash_count')[:1]
            if not cash_payment_method:
                raise UserError(_("No cash statement found for this session. Unable to record returned cash."))
            return_payment_vals = {
                'name': _('return'),
                'pos_order_id': order.id,
                'amount': -pos_order['amount_return'],
                'tip': float(pos_order['tip']),
                'payment_date': fields.Datetime.now(),
                'payment_method_id': cash_payment_method.id,
            }
            order.add_payment(return_payment_vals)

    @api.model
    def _payment_fields(self, order, ui_paymentline, tip):
        return {
            'amount': ui_paymentline['amount'] - tip or 0.0,
            'tip': tip,
            'payment_date': ui_paymentline['name'],
            'payment_method_id': ui_paymentline['payment_method_id'],
            'card_type': ui_paymentline.get('card_type'),
            'transaction_id': ui_paymentline.get('transaction_id'),
            'pos_order_id': order.id,
        }


