import { Strategy as DiscordStrategy } from 'passport-discord';
import { findOrCreateUserModel } from '../../social-login.utils.js';
import { logger } from '../../../../../shared/logger.js';

const strategy = new DiscordStrategy(
  {
    clientID: process.env.DISCORD_CLIENT_ID,
    clientSecret: process.env.DISCORD_CLIENT_SECRET,
    callbackURL: '/api/v1/auth-social/discord/callback',
    scope: ['identify', 'email'],
  },
  async (accessToken, refreshToken, profile, done) => {
    logger.info('profile: discord: ', profile);
    try {
      const user = await findOrCreateUserModel(profile, 'discord');
      return done(null, user);
    } catch (err) {
      return done(err, null);
    }
  },
);

export default strategy;
