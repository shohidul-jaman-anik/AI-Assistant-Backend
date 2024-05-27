const express = require("express");
const { adminController } = require("../controllers/admin.controller");
const { authController } = require("../auth/auth.controller");

const router = express.Router()


router.route('/makeSeller/:id')
    .put(adminController.updateSeller)
router.route('/updateUserRole/:id')
    .put(adminController.updateUserRole)


router.route('/deleteUser/:id')
    .delete(adminController.deleteUser)


router.route('/admin/:email')
    .get(adminController.getAdmin)


router.route('/sellerRequest')
    .get(authController.verifyAdmin, adminController.getAllSellerRequest)
// .get(adminController.getAllSeller)


module.exports = router;