import express from 'express';
import { ENUM_USER_ROLE } from '../../../shared/enum.js';
import auth from '../../middlewares/auth/auth.js';
import { validateRequest } from '../../middlewares/validateRequest/validateRequest.js';
import { SupportController } from './support.controller.js';
import { supportValidationSchema } from './support.validation.js';
const router = express.Router();

router
  .route('/req-support/:id')
  .post(
    validateRequest(supportValidationSchema),
    SupportController.reqForSupport,
  );

router.route('/:id').get(SupportController.getSupportById);
router
  .route('/update-support-req/:id')
  .patch(SupportController.updateSupportReq);
router
  .route('/delete-support-req/:id')
  .delete(SupportController.deleteSupportReq);

router
  .route('/all-support')
  .get(
    auth(ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.USER),
    SupportController.getAllSupportReq,
  );

router.route('/bulk-delete').delete(SupportController.bulkDeleteSupportReq);

export const supportRoutes = router;
