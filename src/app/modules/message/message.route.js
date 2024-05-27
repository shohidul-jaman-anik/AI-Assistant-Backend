const express = require("express")
const messageRoute = require("./message.controller")
const router = express.Router()


router.route('/').post(messageRoute.addMessage)
router.route('/:chatId').get(messageRoute.getMessages)
router.route('/:id').delete(messageRoute.deleteMessage)
router.route('/:id').put(messageRoute.EditMessage)

module.exports = router;