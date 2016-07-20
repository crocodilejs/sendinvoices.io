
import s from 'underscore.string';
import Stripe from 'stripe';
import mongoose from 'mongoose';
import Boom from 'boom';
import _ from 'lodash';
import validator from 'validator';

import config from '../../../config';
import Invoices from '../../models/invoice';
import Users from '../../models/user';

const stripe = new Stripe(config.stripe.secret_key);

export default class AppController {

  static async home(ctx) {
    if (ctx.isAuthenticated())
      return await ctx.render('dashboard');
    await ctx.render('home');
  }

  static status(ctx) {
    ctx.body = { status: 'online' };
  }

  static async chargeInvoice(ctx) {

    // we need to populate `ctx.invoice.user` on the `ctx` variable
    const user = await Users.findById(ctx.invoice.user).lean();

    if (!user)
      return ctx.throw(Boom.badRequest(ctx.translate('ERR_USER_NOT_EXIST')));

    // ensure `stripeToken` is in the `ctx.req.body` and ensure its a str
    if (!_.isString(ctx.req.body.stripeToken)
      || s.isBlank(ctx.req.body.stripeToken)) {
      ctx.throw(Boom.badRequest(ctx.translate(
        'ERR_INVALID_STRIPE_TOKEN'
      )));
      return;
    }

    // charge the user over stripe (and give the money to you)
    try {

      const charge = await stripe.charges.create({
        amount: ctx.invoice.amount_cents,
        currency: 'usd',
        source: ctx.req.body.stripeToken
      }, {
        stripe_account: user.stripe_user_id
      });

      // TODO: we should probably wrap this with try/catch in case
      // mongoose fails to save the invoice, we let user know it worked
      ctx.invoice.charge = charge;
      ctx.invoice.status = 'paid';
      await ctx.invoice.save();

      ctx.flash('success', ctx.translate('INVOICE_PAID'));

      // TODO: allow user to specify custom redirect
      // kind of like how paypal has when someone pays
      ctx.redirect('/');

      // TODO: send email to both parties saying invoice was paid

    } catch (err) {
      ctx.throw(err);
    }

  }

  static async sendInvoice(ctx) {

    // email (Email)
    // amount (Number) - must be between 1 and 10000

    if (!_.isString(ctx.req.body.email)
      || !validator.isEmail(ctx.req.body.email))
      return ctx.throw(Boom.badRequest(ctx.translate('ERR_INVALID_EMAIL')));

    if (_.isString(ctx.req.body.amount))
      ctx.req.body.amount = Number(ctx.req.body.amount);

    if (!_.isNumber(ctx.req.body.amount))
      return ctx.throw(Boom.badRequest(ctx.translate('ERR_NOT_NUMBER')));

    if (ctx.req.body.amount < 1)
      return ctx.throw(Boom.badRequest(ctx.translate('ERR_AMOUNT_NOT_MIN')));

    if (ctx.req.body.amount > 10000)
      return ctx.throw(Boom.badRequest(ctx.translate('ERR_AMOUNT_OVER_MAX')));

    // filter out the values we want for simplicity
    ctx.req.body = _.pick(ctx.req.body, [ 'email', 'amount' ]);

    // now that everything is OK we need to make a new invoice
    // and then email the invoice to the customer
    // the invoice will simply have `user`, `amount`, `email`, `reference`
    const invoice = await Invoices.create({
      ...ctx.req.body,
      user: ctx.req.user._id
    });

    // TODO: send email to user with invoice link

    // alert the user that the invoice was created and sent successfully
    ctx.flash('success', ctx.translate(
      'SENT_INVOICE',
      invoice.amount,
      invoice.email
    ));
    ctx.redirect('/');

  }

  static async retrieveInvoice(ctx, next) {

    // ensure id param is valid
    const isValid = mongoose.Types.ObjectId.isValid(ctx.params.id);

    if (!isValid)
      return ctx.throw(Boom.badRequest(ctx.translate('ERR_INVOICE_NOT_EXIST')));

    // lookup the invoice
    const invoice = await Invoices.findById(ctx.params.id);

    if (!invoice)
      return ctx.throw(Boom.badRequest(ctx.translate('ERR_INVOICE_NOT_EXIST')));

    // check if it has already been paid
    if (invoice.status === 'paid')
      return ctx.throw(Boom.badRequest(ctx.translate('ERR_INVOICE_PAID')));

    // set ctx.invoice so we can use it in other middleware
    ctx.invoice = invoice;

    await next();

  }

  static async payInvoice(ctx) {
    // if it has not yet been paid, render the page where people can pay
    ctx.state.invoice = ctx.invoice;
    ctx.state.title = `Pay Invoice #${ctx.invoice.reference}`;
    await ctx.render('pay-invoice');
  }

}
