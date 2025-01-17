import httpStatus from 'http-status';
import mongoose from 'mongoose';
import UserModel from '../auth/auth.model.js';
import Llama from './groq.model.js';

const getAiResponsesByUserId = async userId => {
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

const getAiResponsesBySession = async id => {
  const sessionData = await Llama.findOne({
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

const deleteOneLlamaAiSession = async objectId => {
  const userData = await Llama.findOne({
    _id: objectId,
  });
  if (!userData) {
    throw new Error('LlamaAiSession not found');
  }
  const deleteResult = await Llama.deleteOne({
    _id: objectId,
  });

  // Check if the LlamaAiSession was successfully deleted
  if (deleteResult.deletedCount === 1) {
    // Remove the LlamaAiSession reference from the user model
    const userUpdateResult = await UserModel.updateOne(
      { _id: userData.user },
      { $pull: { llamaAiSessions: objectId } },
    );

    console.log(userUpdateResult, 'userUpdateResult userUpdateResult');

    // Check if the user model was successfully updated
    if (userUpdateResult.modifiedCount === 1) {
      return {
        success: true,
        message: 'LlamaAiSession and user reference deleted successfully',
      };
    } else {
      throw new Error('Failed to update the user model');
    }
  } else {
    throw new Error('Failed to delete the LlamaAiSession');
  }
};

const deleteAllAiSessionsService = async userId => {
  const session = await mongoose.startSession();

  try {
    await session.startTransaction();

    // Fetch user data to get the LlamaAiSession array
    const user = await UserModel.findById(userId).session(session);
    if (
      !user ||
      !user.llamaAiSessions ||
      !Array.isArray(user.llamaAiSessions)
    ) {
      throw new Error('User or LlamaAiSession data not found');
    }

    const aiSessionIds = user.llamaAiSessions.map(id => id.toString());
    console.log('AI Session IDs to delete:', aiSessionIds);

    // Delete the AI sessions
    const deleteResults = await Promise.all(
      aiSessionIds.map(id => Llama.deleteOne({ _id: id }).session(session)),
    );

    console.log('Delete Results:', deleteResults);

    // Check if all AI sessions were successfully deleted
    const allDeleted = deleteResults.every(result => result.deletedCount === 1);
    if (!allDeleted) {
      throw new Error('Failed to delete one or more AI sessions');
    }

    // Remove the AI session references from the user model
    const userUpdateResult = await UserModel.updateOne(
      { _id: userId },
      { $pull: { llamaAiSessions: { $in: aiSessionIds } } },
    ).session(session);

    console.log('User update result:', userUpdateResult);

    if (userUpdateResult.acknowledged && userUpdateResult.modifiedCount > 0) {
      await session.commitTransaction();
      session.endSession();
      return {
        statusCode: 200,
        success: true,
        message: 'AI sessions and user references deleted successfully',
      };
    } else {
      throw new Error('Failed to update the user model');
    }
  } catch (error) {
    await session.abortTransaction();
    session.endSession();
    console.error('An error occurred:', error);
    return {
      success: false,
      message: 'An internal server error occurred',
      error: error.message,
    };
  }
};

export const LlamaAiService = {
  getAiResponsesByUserId,
  getAiResponsesBySession,
  deleteOneLlamaAiSession,
  deleteAllAiSessionsService,
};
