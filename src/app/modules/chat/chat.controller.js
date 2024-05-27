const ChatModel = require("./chatModel");

module.exports.createChat = async (req, res) => {
    const newChat = new ChatModel({
        members: [req.body.senderEmail, req.body.receiverEmail],
    });
    try {
        const result = await newChat.save();
        res.status(200).json(result);
    } catch (error) {
        res.status(500).json(error);
    }
};

module.exports.userChats = async (req, res) => {
    try {
        const chat = await ChatModel.find({
            members: { $in: [req.params.userEmail] },
        });
        res.status(200).json(chat);
    } catch (error) {
        res.status(500).json(error);
    }
};

module.exports.deleteChat = async (req, res) => {
    try {
        const id = req.params.id;
        console.log(id);
        const deleteUniqueChat = await ChatModel.findByIdAndDelete(id);

        if (!deleteUniqueChat) {
            return res.status(404).json({ message: 'Chat not found' });
        }

        res.status(200).json({ message: 'Chat deleted successfully' });
    } catch (error) {
        res.status(500).json(error);
    }
};