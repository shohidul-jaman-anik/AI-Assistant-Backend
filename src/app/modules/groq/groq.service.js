module.exports.getAiResponsesByUserId = async userId => {
  const sessionData = await UserModel.findOne({
    _id: userId,
  })
    .select('email profile')
    .populate({
      path: 'llamaAiSessions',
    });
  if (!sessionData) {
    return {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'Session not found',
    };
  }
  return sessionData;
};

module.exports.getAiResponsesBySession = async id => {
  const sessionData = await LlamaAiSession.findOne({
    sessionId: id,
  });
  console.log(sessionData, 'sessionData');

  if (!sessionData) {
    return {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'Session not found',
    };
  }
  return sessionData;
};
