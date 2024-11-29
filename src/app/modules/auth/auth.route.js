const express = require('express');
const { authController } = require('./auth.controller');
const router = express.Router();
const limiter = require('../../middlewares/rateLimit/authLimiter');
const UserValidationSchema = require('./auth.validation');
const {
  validateRequest,
} = require('../../middlewares/validateRequest/validateRequest');

router.route('/user/single-user/:userId').get(authController.getUser); // user with id
router.route('/user/:userEmail').get(authController.getUserByEmail); // user with email

// router.route('/register').post(authController.register)// Register user
router
  .route('/register')
  .post(
    limiter.authLimiter,
    validateRequest(UserValidationSchema),
    authController.register,
  ); // Register user
router.route('/register/confirmation/:token').get(authController.confirmEmail); // verify mail

router.route('/login').post(authController.login); // login in app
// router.route('/login').post(limiter.authLimiter, authController.login) // login in app

router.route('/forget-password').post(authController.forgetPassword);
router.route('/reset-password').post(authController.resetPassword);
router.route('/change-password/:userId').post(authController.changePassword); // Change Pass if match

router.route('/allUser').get(authController.getAllUsers); // get all user

router.route('/update-user/:userId').put(authController.updateUser); // is to use update user profile
router
  .route('/delete-account-otp/:id')
  .delete(authController.deleteUserAccountOTP); // use to delete account
router.route('/delete-account/:id').delete(authController.deleteUserAccount); // use to delete account

module.exports = router;
