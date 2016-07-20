
import Router from 'koa-router';
import config from '../config';
import { renderPage, passport, Policies } from '../helpers';
import { app, api } from '../app/controllers';

const router = new Router();

// api routes
router.get('/v1/users', Policies.ensureApiToken, api.v1.Users.retrieve);

// non-api routes
router
  .get('/', app.home)
  .post('/send-invoice', app.sendInvoice)
  .get('/pay-invoice/:id', app.retrieveInvoice, app.payInvoice)
  .post('/pay-invoice/:id', app.retrieveInvoice, app.chargeInvoice)
  .get('/status', app.status)
  .get('/about', renderPage('about'))
  .get('/my-account', Policies.ensureLoggedIn, renderPage('my-account'))
  .all('/admin*', Policies.ensureAdmin)
  .get('/admin', renderPage('admin'))
  .get('/404', renderPage('404'))
  .get('/500', renderPage('500'))
  .get(
    '/logout',
    Policies.ensureLoggedIn,
    ctx => {
      ctx.logout();
      ctx.redirect('/');
      return;
    }
  )
  .get(
    '/login',
    Policies.ensureLoggedOut,
    config.auth.catchError,
    passport.authenticate('stripe', config.auth.stripe)
  )
  .get(
    '/login/ok',
    Policies.ensureLoggedOut,
    config.auth.catchError,
    passport.authenticate('stripe', config.auth.callbackOpts)
  )
  .get(
    '/auth/:provider',
    Policies.ensureLoggedIn,
    config.auth.catchError,
    (ctx, next) => passport.authenticate(
      ctx.params.provider,
      config.auth[ctx.params.provider]
    )(ctx, next)
  )
  .get(
    '/auth/:provider/ok',
    Policies.ensureLoggedIn,
    config.auth.catchError,
    (ctx, next) => passport.authenticate(
      ctx.params.provider, config.auth.callbackOpts
    )(ctx, next)
  )
  .get('/signup', ctx => ctx.redirect('/login'));

export default router;
