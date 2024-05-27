const express = require("express")
const chatRoute = require("./chat.controller")
const router = express.Router()

router.route('/').post(chatRoute.createChat)
router.route('/:userEmail').get(chatRoute.userChats)
router.route('/:id').delete(chatRoute.deleteChat)

module.exports = router;