const express = require("express")
const router = express.Router()
const paymentRoute = require("./payment.controller")

router.route('/delete/:id').delete(paymentRoute.deletePayment)
router.route('/createPaymentIntent').post(paymentRoute.createPayment)
router.route('/updatePayment').patch(paymentRoute.updatePayment)
router.route('/owner/paymentItems').get(paymentRoute.getOwnerPayment)
router.route('/tenants/paymentItem').get(paymentRoute.getTenantsPayment)
router.route('/singlePayment/:id').get(paymentRoute.getSinglePayment)
router.route('/allPayments').get(paymentRoute.getAllPayment)

module.exports = router;