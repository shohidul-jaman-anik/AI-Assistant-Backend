import express from 'express';
import { AdminController } from './admin.controller.js';
import { authController } from '../auth/auth.controller.js';
const router = express.Router();

router.route('/makeSeller/:id').put(AdminController.makeAdmin);
router.route('/updateUserRole/:id').put(AdminController.updateUserRole);

router.route('/deleteUser/:id').delete(AdminController.deleteUser);

router
  .route('/allUser')
  .get(AdminController.getAllUser);


router
  .route('/allUsers')
  .get(authController.verifyAdmin, AdminController.getAllUsers);

router.route('/admin/:email').get(AdminController.getAdmin);


export const adminRoutes = router;
