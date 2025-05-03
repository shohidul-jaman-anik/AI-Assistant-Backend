import express from 'express';
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

router.route('/all-support').get(SupportController.getAllSupportReq);

router.route('/bulk-delete').delete(SupportController.bulkDeleteSupportReq);

export const supportRoutes = router;
