
import passport from 'koa-passport';

import { Strategy as StripeStrategy } from 'passport-stripe';

import Users from '../app/models/user';
import config from '../config';

passport.serializeUser((user, done) => {
  done(null, user.stripe_user_id);
});

passport.deserializeUser(async (stripeUserId, done) => {
  try {
    const user = await Users.findOne({ stripe_user_id: stripeUserId });
    // if no user exists then invalidate the previous session
    // <https://github.com/jaredhanson/passport/issues/6#issuecomment-4857287>
    if (!user) return done(null, false);
    // otherwise continue along
    done(null, user);
  } catch (err) {
    done(err);
  }
});

passport.use(new StripeStrategy(
  config.strategies.stripe,
  async (accessToken, refreshToken, profile, done) => {

    try {

      let user = await Users.findOne({
        stripe_user_id: profile.stripe_user_id
      });

      if (!user)
        user = await Users.create({
          stripe_user_id: profile.stripe_user_id
        });

      // store the access token and refresh token
      if (accessToken)
        user.set('stripe_access_token', accessToken);
      if (refreshToken)
        user.set('stripe_refresh_token', refreshToken);

      user = await user.save();

      done(null, user.toObject());

    } catch (err) {
      done(err);
    }

  }
));

export default passport;
