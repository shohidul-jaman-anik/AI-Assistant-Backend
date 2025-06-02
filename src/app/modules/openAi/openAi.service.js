import { InMemoryChatMessageHistory } from '@langchain/core/chat_history';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import httpStatus from 'http-status';
import { BufferMemory } from 'langchain/memory';
import { OpenAI } from 'openai';
import config from '../../../../config/index.js';
import { logger } from '../../../shared/logger.js';
import sendResponse from '../../../shared/sendResponse.js';
import UserModel from '../auth/auth.model.js';
import Llama from '../groq/groq.model.js';
import { paymentController } from '../payment/payment.controller.js';

const openaiClient = new OpenAI({ apiKey: config.openai_secret_key });
const sessionMemoryStore = {};

const openAiService4o = async (prompt, userId, sessionId) => {
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

    // Call GPT-4o Mini API
    const response = await openaiClient.chat.completions.create({
      model: 'gpt-4o',
      messages: [{ role: 'user', content: prompt }],
    });

    const reply =
      response?.choices?.[0]?.message?.content || 'No reply generated';
    await memory.chatHistory.addMessage(new AIMessage(reply));

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

    const responseData = {
      prompt,
      model: 'gpt-4o-mini',
      reply,
      total_time: response?.usage?.total_time || 0,
    };

    let aiSession = await Llama.findOne({ user: userId, sessionId });

    if (aiSession) {
      aiSession.responses.push(responseData);
      await aiSession.save();
    } else {
      aiSession = await Llama.create({
        user: userId,
        sessionId,
        responses: [responseData],
      });
      await UserModel.findByIdAndUpdate(userId, {
        $push: { llamaAiSessions: aiSession._id },
      });
    }
    const payload = { prompt, sessionId, reply };
    return payload;
  } catch (error) {
    console.error('Error in GPT-4o Mini:', error);
    sendResponse(res, {
      statusCode: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
      message: 'Failed to get response',
      error: error.message,
    });
  }
};

export const openAIAiServices = {
  openAiService4o,
};
