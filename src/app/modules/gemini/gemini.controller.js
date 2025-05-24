import { GoogleGenerativeAI } from '@google/generative-ai';
import { InMemoryChatMessageHistory } from '@langchain/core/chat_history';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { randomUUID } from 'crypto';
import httpStatus from 'http-status';
import config from '../../../../config/index.js';
import catchAsync from '../../../shared/catchAsync.js';
import sendResponse from '../../../shared/sendResponse.js';
import UserModel from '../auth/auth.model.js';
import Llama from '../groq/groq.model.js';
// import { ConversationChain } from 'langchain/chains';
import { BufferMemory } from 'langchain/memory';
import ApiError from '../../../errors/ApiError.js';

const client = new GoogleGenerativeAI(config.gemini_secret_key);
const model = client.getGenerativeModel({ model: 'gemini-1.5-flash' });

const sessionMemoryStore = {};

const GeminiAiGetResponse = catchAsync(async (req, res) => {
  const prompt = req.body?.prompt;
  const userId = req.user?._id;
  console.log(userId, 'userId from token in controller');
  const sessionId = req.body?.sessionId || randomUUID();

  if (!prompt) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'Validation Error',
      errorMessages: [{ path: 'prompt', message: 'Prompt is required.' }],
    });
  }

  const user = await UserModel.isUserExist(userId);
  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  let memory = sessionMemoryStore[sessionId];
  if (!memory) {
    memory = new BufferMemory({
      returnMessages: true,
      memoryKey: 'history',
      chatHistory: new InMemoryChatMessageHistory(),
    });
    sessionMemoryStore[sessionId] = memory;
  }

  try {
    await memory.chatHistory.addMessage(new HumanMessage(prompt));

    // Call Gemini AI to generate a response
    const result = await model.generateContent(prompt);
    const reply =
      result?.response?.candidates?.[0]?.content?.parts?.[0]?.text ||
      'No reply generated';

    await memory.chatHistory.addMessage(new AIMessage(reply));

    const responseData = {
      prompt,
      model: 'gemini-1.5-flash',
      reply,
      total_time: result?.usage?.total_time || 0,
    };

    let geminiSession = await Llama.findOne({ user: userId, sessionId });

    if (geminiSession) {
      geminiSession.responses.push(responseData);
      await geminiSession.save();
    } else {
      geminiSession = await Llama.create({
        user: userId,
        sessionId,
        responses: [responseData],
      });
      await UserModel.findByIdAndUpdate(userId, {
        $push: { llamaAiSessions: geminiSession._id },
      });
    }

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Response processed successfully.',
      data: { prompt, sessionId, reply },
    });
  } catch (error) {
    console.error('Error in Gemini AI:', error);
    sendResponse(res, {
      statusCode: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
      message: 'Failed to get response',
      error: error.message,
    });
  }
});

export const GeminiAiController = {
  GeminiAiGetResponse,
};
