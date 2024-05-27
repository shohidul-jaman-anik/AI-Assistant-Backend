const express = require('express');
const { adminController } = require('./admin.controller');
const { authController } = require('../auth/auth.controller');
const router = express.Router();

router.route('/makeSeller/:id').put(adminController.makeAdmin);
router.route('/updateUserRole/:id').put(adminController.updateUserRole);

router.route('/deleteUser/:id').delete(adminController.deleteUser);

router
  .route('/allUser')
  .get(adminController.getAllUser);


router
  .route('/allUsers')
  .get(authController.verifyAdmin, adminController.getAllUsers);

router.route('/admin/:email').get(adminController.getAdmin);


module.exports = router;
