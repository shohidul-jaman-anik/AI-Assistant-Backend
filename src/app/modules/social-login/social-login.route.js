import { Router } from 'express';
import passport from 'passport';
import jwt from 'jsonwebtoken';
import config from '../../../../config/index.js';
import { twitterAuth } from './config/strategies/twitter.js';
import { getUser, getUserByEmail } from './social-login.utils.js';


const router = Router();

function sendTokenResponse(user, res) {
    const token = jwt.sign(
        {
            email: user.email,
            role: user.role,
            id: user._id
        },
        config.jwt_secret,
        { expiresIn: '7d' }
    );
    // return res.redirect(process.env.CLIENT_URL + '/auth/callback#token=' + token);
    return res.status(200).send({
        mgs: 'Login successful...!',
        email: user.email,
        token
    });
}

router.route('/user/single-user/:userId').get(getUser); // user with id
router.route('/user/:userEmail').get(getUserByEmail); // user with email


// Google
router.get(
    '/google',
    passport.authenticate('google', { scope: ['profile', 'email'], session: false })
);
router.get(
    '/google/callback',
    passport.authenticate('google', { session: false, failureRedirect: '/api/v1/auth-social/login' }),
    (req, res) => sendTokenResponse(req.user, res)
);

// Facebook
router.get(
    '/facebook',
    passport.authenticate('facebook', { scope: ['email'], session: false })
);
router.get(
    '/facebook/callback',
    passport.authenticate('facebook', { session: false, failureRedirect: '/api/v1/auth-social/login' }),
    (req, res) => sendTokenResponse(req.user, res)
);

// Twitter
router.get('/twitter', twitterAuth.authenticate);
router.get('/twitter/callback', twitterAuth.callback);


// GitHub
router.get(
    '/github',
    passport.authenticate('github', { scope: ['user:email'], session: false })
);
router.get(
    '/github/callback',
    passport.authenticate('github', { session: false, failureRedirect: '/api/v1/auth-social/login' }),
    (req, res) => sendTokenResponse(req.user, res)
);

// Microsoft
router.get(
    '/microsoft',
    passport.authenticate('microsoft', { scope: ['user.read'], session: false })
);
router.post(
    '/microsoft/callback',
    passport.authenticate('microsoft', { session: false, failureRedirect: '/api/v1/auth-social/login' }),
    (req, res) => sendTokenResponse(req.user, res)
);

// Apple
router.get(
    '/apple',
    passport.authenticate('apple', { session: false, scope: ['name', 'email'] })
);
router.post(
    '/apple/callback',
    passport.authenticate('apple', { session: false, failureRedirect: '/api/v1/auth-social/login' }),
    (req, res) => sendTokenResponse(req.user, res)
);

// Discord
router.get(
    '/discord',
    passport.authenticate('discord', { scope: ['email'], session: false })
);
router.get(
    '/discord/callback',
    passport.authenticate('discord', { session: false, failureRedirect: '/api/v1/auth-social/login' }),
    (req, res) => sendTokenResponse(req.user, res)
);

// Logout (no-op since stateless)
router.get('/logout', (req, res) => {
    return res.status(200).send({ msg: 'Logged out' });
});

export const socialLoginRotes = router;
