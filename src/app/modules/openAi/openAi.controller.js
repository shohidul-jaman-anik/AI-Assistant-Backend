
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
import { OpenAI } from 'openai';


// const client = new GoogleGenerativeAI(config.gemini_secret_key);
// const model = client.getGenerativeModel({ model: "gemini-1.5-flash" });

// const sessionMemoryStore = {};

// const GeminiAiGetResponse = catchAsync(async (req, res) => {
//   const prompt = req.body?.prompt;
//   const userId = req.body?.user;
//   const sessionId = req.body?.sessionId || randomUUID();

//   if (!prompt) {
//     return sendResponse(res, {
//       statusCode: httpStatus.BAD_REQUEST,
//       success: false,
//       message: 'Validation Error',
//       errorMessages: [{ path: 'prompt', message: 'Prompt is required.' }],
//     });
//   }


//   const user = await UserModel.findById(userId);
 

//   if (!user) {
//     return sendResponse(res, {
//       statusCode: httpStatus.NOT_FOUND,
//       success: false,
//       message: 'User not found.',
//     });
//   }

//   let memory = sessionMemoryStore[sessionId];
//   if (!memory) {
//     memory = new BufferMemory({
//       returnMessages: true,
//       memoryKey: 'history',
//       chatHistory: new InMemoryChatMessageHistory(),
//     });
//     sessionMemoryStore[sessionId] = memory;
//   }

//   try {
//     await memory.chatHistory.addMessage(new HumanMessage(prompt));

//     // Call Gemini AI to generate a response
//     const result = await model.generateContent(prompt);
//     const reply =
//       result?.response?.candidates?.[0]?.content?.parts?.[0]?.text || 'No reply generated';

//     await memory.chatHistory.addMessage(new AIMessage(reply));

//     const responseData = {
//       prompt,
//       model: 'gemini-1.5-flash',
//       reply,
//       total_time: result?.usage?.total_time || 0,
//     };

//     let geminiSession = await Llama.findOne({ user: userId, sessionId });

//     if (geminiSession) {
//       geminiSession.responses.push(responseData);
//       await geminiSession.save();
//     } else {
//       geminiSession = await Llama.create({
//         user: userId,
//         sessionId,
//         responses: [responseData],
//       });
//       await UserModel.findByIdAndUpdate(userId, {
//         $push: { llamaAiSessions: geminiSession._id },
//       });
//     }

//     sendResponse(res, {
//       statusCode: httpStatus.OK,
//       success: true,
//       message: 'Response processed successfully.',
//       data: { prompt, sessionId, reply },
//     });
//   } catch (error) {
//     console.error('Error in Gemini AI:', error);
//     sendResponse(res, {
//       statusCode: httpStatus.INTERNAL_SERVER_ERROR,
//       success: false,
//       message: 'Failed to get response',
//       error: error.message,
//     });
//   }
// });

const openaiClient = new OpenAI({ apiKey: config.openai_secret_key });

const sessionMemoryStore = {};

const Gpt4oMiniGetResponse = catchAsync(async (req, res) => {
  const prompt = req.body?.prompt;
  const userId = req.body?.user;
  const sessionId = req.body?.sessionId || randomUUID();

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

    const reply = response?.choices?.[0]?.message?.content || 'No reply generated';
    await memory.chatHistory.addMessage(new AIMessage(reply));

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

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Response processed successfully.',
      data: { prompt, sessionId, reply },
    });
  } catch (error) {
    console.error('Error in GPT-4o Mini:', error);
    sendResponse(res, {
      statusCode: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
      message: 'Failed to get response',
      error: error.message,
    });
  }
});


export const openAIAiController = {
  Gpt4oMiniGetResponse
};
