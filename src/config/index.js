
// turn off max length eslint rule since this is a config file with long strs
/* eslint max-len: 0*/

import s from 'underscore.string';
import os from 'os';
import _ from 'lodash';
import path from 'path';
import dotenv from 'dotenv';

// load default env vars from `.env` file
dotenv.load();

import environments from './environments';
import locales from './locales';

const APP_NAME = 'sendinvoices.io';
const PORT = process.env.PORT || 3000;
const HOST = process.env.HOST || 'localhost';
const PROTOCOL = process.env.PROTOCOL || 'http';
const MAX_AGE = 24 * 60 * 60 * 1000;

const ENV = process.env.NODE_ENV ? process.env.NODE_ENV.toLowerCase() : 'development';
const DATABASE_URL = process.env.DATABASE_URL || `mongodb://localhost:27017/${s.underscored(APP_NAME).replace(/\./g, '')}_${ENV}`;
const REDIS_URL = process.env.REDIS_URL || 'redis://127.0.0.1:6379';
const URL = process.env.CUSTOM_URL || `${PROTOCOL}://${HOST}${PORT === 80 || PORT === 443 ? '' : `:${PORT}`}`;
const omitCommonFields = [ '_id', '__v' ];

let config = {
  livereload: {
    port: 1337
  },
  cookiesKey: 'glazed.sid',
  localesDirectory: path.join(__dirname, '..', '..', 'src', 'locales'),
  mongooseDebug: true,
  email: {
    from: 'niftylettuce <support@wakeup.io>',
    attachments: [],
    headers: {}
  },
  postmark: {
    service: 'postmark',
    auth: {
      user: process.env.POSTMARK_API_TOKEN,
      pass: process.env.POSTMARK_API_TOKEN
    }
  },
  omitCommonFields,
  omitUserFields: [
    ...omitCommonFields,
    'email',
    'api_token',
    'group',
    'hash',
    'salt'
  ],
  agenda: {
    name: `${os.hostname()}-${process.pid}`,
    db: {
      address: DATABASE_URL,
      collection: 'jobs'
    },
    maxConcurrency: 20
  },
  showStack: false,
  ga: 'UA-77185440-1',
  aws: {
    key: process.env.AWS_IAM_KEY,
    accessKeyId: process.env.AWS_IAM_KEY,
    secret: process.env.AWS_IAM_SECRET,
    secretAccessKey: process.env.AWS_IAM_SECRET,
    distributionId: process.env.AWS_CF_DI,
    domainName: process.env.AWS_CF_DOMAIN,
    params: {
      Bucket: process.env.AWS_S3_BUCKET
    }
  },
  mongodb: DATABASE_URL,
  redis: REDIS_URL,
  sessionKeys: [ 'glazed' ],
  buildDir: path.join(__dirname, '..', '..', 'build'),
  viewsDir: path.join(__dirname, '..', '..', 'src', 'app', 'views'),
  sentry: process.env.SENTRY_DSN || '',
  nunjucks: {
    ext: 'njk',
    autoescape: true,
    // watch
    // <https://mozilla.github.io/nunjucks/api.html#configure>
    noCache: ENV !== 'production',
    filters: {
      json: str => {
        return JSON.stringify(str, null, 2);
      }
    }
    // globals: {
    //   version: '0.0.1'
    // }
  },
  rateLimit: {
    max: 1000,
    id: ctx => ctx.ip
  },
  koaManifestRev: {
    manifest: path.join(__dirname, '..', '..', 'build', 'rev-manifest.json'),
    // note in production we switch this to CloudFront
    prepend: '/'
  },
  appName: APP_NAME,
  appColor: '#3EA1A0',
  protocol: PROTOCOL,
  port: parseInt(PORT, 10),
  host: HOST,
  env: ENV,
  url: URL,
  stripe: {
    secret_key: process.env.STRIPE_SECRET,
    publishable_key: process.env.STRIPE_PUBLISHABLE_KEY
  },
  strategies: {
    stripe: {
      clientID: process.env.STRIPE_ID,
      clientSecret: process.env.STRIPE_SECRET,
      callbackURL: `${URL}/login/ok`
    }
  },
  auth: {
    catchError: async function(ctx, next) {
      try {
        await next();
      } catch (err) {
        ctx.flash('error', err.message);
        ctx.redirect('/');
      }
    },
    callbackOpts: {
      successReturnToOrRedirect: '/',
      failureRedirect: '/',
      successFlash: true,
      failureFlash: true
    },
    stripe: {
      scope: 'read_write'
    }
  },
  serveStatic: {
    maxage: MAX_AGE
  },
  meta: {
    '/': {
      title: `${APP_NAME} | Home`,
      desc: 'Send invoices for free with Stripe Connect, an FOSS alternative to Freshbooks'
    },
    '/404': {
      title: `${APP_NAME} | Page Not Found`,
      desc: 'The page you requested could not be found'
    },
    '/500': {
      title: `${APP_NAME} | Oops!`,
      desc: 'Oops! A server error occurred'
    }
  }
};

config.locales = locales;

config.i18n = {

  // info
  HELLO_WORLD: 'Hello %s world',
  SENT_INVOICE: 'You successfully sent an invoice in the amount of %d to %s',
  INVOICE_PAID: 'You successfully paid the invoice, thank you!',

  // warn

  // err
  ERR_INVALID_EMAIL: 'Email address was invalid',
  ERR_NOT_NUMBER: 'You did not enter a valid number',
  ERR_AMOUNT_NOT_MIN: 'Amount must be at least (1)',
  ERR_AMOUNT_OVER_MAX: 'Amount must be less than or equal to (10000)',
  ERR_INVOICE_NOT_EXIST: 'Invoice does not exist',
  ERR_INVOICE_PAID: 'Invoice was already paid, woo hoo!',
  ERR_INVALID_STRIPE_TOKEN: 'An issue occurred with our payment gateway, please try again later',
  ERR_USER_NOT_EXIST: 'User does not exist'

};

if (_.isObject(environments[ENV]))
  config = _.merge(config, environments[ENV]);

export default config;
