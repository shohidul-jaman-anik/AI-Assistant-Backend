import express from 'express';
import { ENUM_USER_ROLE } from '../../../shared/enum.js';
import auth from '../../middlewares/auth/auth.js';
import { authController } from '../auth/auth.controller.js';
import { AdminController } from './admin.controller.js';
const router = express.Router();

router
  .route('/update-user-role/:id')
  .put(auth(ENUM_USER_ROLE.SUPER_ADMIN), AdminController.updateUserRole);

router
  .route('/delete-user/:objectId')
  .delete(auth(ENUM_USER_ROLE.ADMIN), AdminController.deleteUser);

router.route('/buyer/all-user').get(AdminController.getAllBuyer);

router
  .route('/all-user')
  .get(
    auth(ENUM_USER_ROLE.ADMIN),
    authController.verifyAdmin,
    AdminController.getAllUsers,
  );

router
  .route('/all-payment')
  .get(auth(ENUM_USER_ROLE.ADMIN), AdminController.getAllPayment);

router.route('/admin/:email').get(AdminController.getAdmin);

router
  .route('/all-user/statistics')
  .get(auth(ENUM_USER_ROLE.ADMIN), AdminController.getUserStatisticsByMonth);

export const adminRoutes = router;
