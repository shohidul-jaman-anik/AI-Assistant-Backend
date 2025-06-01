import { InMemoryChatMessageHistory } from '@langchain/core/chat_history';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { ChatGroq } from '@langchain/groq';
import { randomUUID } from 'crypto';
import { ConversationChain } from 'langchain/chains';
import { BufferMemory } from 'langchain/memory';
// import { Serper } from 'serper';
import httpStatus from 'http-status';
import config from '../../../../config/index.js';
import ApiError from '../../../errors/ApiError.js';
import catchAsync from '../../../shared/catchAsync.js';
import { logger } from '../../../shared/logger.js';
import sendResponse from '../../../shared/sendResponse.js';
import UserModel from '../auth/auth.model.js';
import Llama from '../groq/groq.model.js';
import { paymentController } from '../payment/payment.controller.js';

const sessionMemoryStore = {}; // Stores session memory for each user session

const QwenAiGetResponse = catchAsync(async (req, res) => {
  const prompt = req.body?.prompt;
  const userId = req.user?._id;
  console.log(userId, 'userId from token in controller');
  const sessionId = req.body?.sessionId || randomUUID(); // Unique session ID if not provided

  if (!prompt) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'Validation Error',
      errorMessages: [{ path: 'prompt', message: 'Prompt is required.' }],
    });
  }

  const user = await UserModel.findById(userId);
  if (!user) {
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'User not found.',
    });
  }

  // Initialize session memory for conversation history
  let memory = sessionMemoryStore[sessionId];
  if (!memory) {
    memory = new BufferMemory({
      returnMessages: true,
      memoryKey: 'history',
      chatHistory: new InMemoryChatMessageHistory(),
    });
    sessionMemoryStore[sessionId] = memory;
  }

  const model = new ChatGroq({
    // model: 'qwen-2.5-coder-32b',
    model: 'qwen-qwq-32b',
    temperature: 0.7,
    apiKey: config.groq_api_key,
  });

  const chain = new ConversationChain({ llm: model, memory });
  logger.info('Memory Initialized:', memory);

  try {
    // Store user message in chat history
    await memory.chatHistory.addMessage(new HumanMessage(prompt));

    // Invoke model
    const res1 = await chain.invoke({ input: prompt });
    logger.info('Model Response:', res1);

    const reply = res1?.response || 'No reply generated';

    try {
      const paymentResult =
        await paymentController.incrementPromptsUsed(userId);

      if (!paymentResult.success) {
        // return res
        //   .status(400)
        //   .json({ success: false, message: paymentResult.message });
        throw new ApiError(httpStatus.BAD_REQUEST, paymentResult.message);
      }
    } catch (error) {
      console.error('Error in incrementPromptsUsed:', error);

      // Send the full error message as a response
      // return res.status(400).json({
      //   success: false,
      //   message:
      //     error.message || 'An error occurred while updating prompt usage.',
      // });
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        error.message || 'An error occurred while updating prompt usage.',
      );
    }
    // Store AI response in chat history
    await memory.chatHistory.addMessage(new AIMessage(reply));

    // Save response in the database
    const responseData = {
      prompt,
      // model: 'qwen-2.5-coder-32b',
      model: 'qwen-qwq-32b',
      reply,
      total_time: res1?.usage?.total_time || 0,
    };

    let llamaSession = await Llama.findOne({ user: userId, sessionId });

    if (llamaSession) {
      logger.info('Existing Session Found:', llamaSession);
      llamaSession?.responses?.push(responseData);
      await llamaSession.save();
      logger.info('Updated Session:', llamaSession);
    } else {
      logger.info('Creating New Session...');
      llamaSession = await Llama.create({
        user: userId,
        sessionId,
        responses: [responseData],
      });
      logger.info('New Session Created:', llamaSession);
      await UserModel.findByIdAndUpdate(userId, {
        $push: { llamaAiSessions: llamaSession._id },
      });
    }

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Response processed successfully.',
      data: {
        sessionId,
        prompt,
        reply,
      },
    });
  } catch (error) {
    console.error('Error in ConversationChain:', error);
    sendResponse(res, {
      statusCode: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
      message: 'Failed to get response',
      error: error.message,
    });
  }
});

const QwenQWQSessionMemoryStore = {}; // Stores session memory for each user session

const QwenQWQAiGetResponse = catchAsync(async (req, res) => {
  const prompt = req.body?.prompt;
  const userId = req.user?._id;
  console.log(userId, 'userId from token in controller');
  const sessionId = req.body?.sessionId || randomUUID(); // Unique session ID if not provided

  if (!prompt) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'Validation Error',
      errorMessages: [{ path: 'prompt', message: 'Prompt is required.' }],
    });
  }

  const user = await UserModel.findById(userId);
  if (!user) {
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'User not found.',
    });
  }

  // Initialize session memory for conversation history
  let memory = QwenQWQSessionMemoryStore[sessionId];
  if (!memory) {
    memory = new BufferMemory({
      returnMessages: true,
      memoryKey: 'history',
      chatHistory: new InMemoryChatMessageHistory(),
    });
    QwenQWQSessionMemoryStore[sessionId] = memory;
  }

  const model = new ChatGroq({
    model: 'qwen-qwq-32b',
    temperature: 0.7,
    apiKey: config.groq_api_key,
  });

  const chain = new ConversationChain({ llm: model, memory });
  logger.info('Memory Initialized:', memory);

  try {
    // Store user message in chat history
    await memory.chatHistory.addMessage(new HumanMessage(prompt));

    // Invoke model
    const res1 = await chain.invoke({ input: prompt });
    logger.info('Model Response:', res1);

    const reply = res1?.response || 'No reply generated';

    try {
      const paymentResult =
        await paymentController.incrementPromptsUsed(userId);

      if (!paymentResult.success) {
        throw new ApiError(httpStatus.BAD_REQUEST, paymentResult.message);
      }
    } catch (error) {
      logger.error('Error in incrementPromptsUsed:', error);
      throw new ApiError(
        httpStatus.INTERNAL_SERVER_ERROR,
        error.message || 'An error occurred while updating prompt usage.',
      );
    }

    // Store AI response in chat history
    await memory.chatHistory.addMessage(new AIMessage(reply));

    // Save response in the database
    const responseData = {
      prompt,
      model: 'qwen-qwq-32b',
      reply,
      total_time: res1?.usage?.total_time || 0,
    };

    let llamaSession = await Llama.findOne({ user: userId, sessionId });

    if (llamaSession) {
      logger.info('Existing Session Found:', llamaSession);
      llamaSession?.responses?.push(responseData);
      await llamaSession.save();
      logger.info('Updated Session:', llamaSession);
    } else {
      logger.info('Creating New Session...');
      llamaSession = await Llama.create({
        user: userId,
        sessionId,
        responses: [responseData],
      });
      logger.info('New Session Created:', llamaSession);
      await UserModel.findByIdAndUpdate(userId, {
        $push: { llamaAiSessions: llamaSession._id },
      });
    }

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Response processed successfully.',
      data: {
        sessionId,
        prompt,
        reply,
      },
    });
  } catch (error) {
    console.error('Error in ConversationChain:', error);
    sendResponse(res, {
      statusCode: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
      message: 'Failed to get response',
      error: error.message,
    });
  }
});

export const QwenAiController = {
  QwenAiGetResponse,
  QwenQWQAiGetResponse,
};
