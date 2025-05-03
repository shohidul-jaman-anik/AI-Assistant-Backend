import express from 'express';
import { AdminController } from './admin.controller.js';
import { authController } from '../auth/auth.controller.js';
const router = express.Router();

router.route('/update-user-role/:id').put(AdminController.updateUserRole);

router.route('/delete-user/:objectId').delete(authController.verifyAdmin, AdminController.deleteUser);

router
  .route('/buyer/all-user')
  .get(AdminController.getAllBuyer);


router
  .route('/all-user')
  .get(authController.verifyAdmin, AdminController.getAllUsers);
  
router
  .route('/all-payment')
  .get(authController.verifyAdmin, AdminController.getAllPayment);

router.route('/admin/:email').get(AdminController.getAdmin);

router.route('/all-user/statistics').get(AdminController.getUserStatisticsByMonth);


export const adminRoutes = router;
