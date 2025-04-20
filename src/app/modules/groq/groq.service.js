import { InMemoryChatMessageHistory } from '@langchain/core/chat_history';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { ChatGroq } from '@langchain/groq';
import { randomUUID } from 'crypto';
import httpStatus from 'http-status';
import { ConversationChain } from 'langchain/chains';
import { BufferMemory } from 'langchain/memory';
import mongoose from 'mongoose';
import config from '../../../../config/index.js';
import UserModel from '../auth/auth.model.js';
import { paymentController } from '../payment/payment.controller.js';
import Llama from './groq.model.js';
import { fetchSearchResults } from './groq.utilities.js';

const sessionMemoryStore = {}; // Stores session memory for each user session

const getAiResponsesGroqService = async (
  prompt,
  userId,
  sessionIdFromClient,
) => {
  const sessionId = sessionIdFromClient || randomUUID(); // Unique session ID if not provided

  if (!prompt) {
    throw ApiError(httpStatus.NOT_FOUND, 'Prompt is required.');
  }

  const user = await UserModel.findById(userId);
  if (!user) {
    throw ApiError(httpStatus.NOT_FOUND, 'User not found');
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
    model: 'llama3-8b-8192',
    temperature: 0.7,
    apiKey: config.groq_api_key,
  });

  const chain = new ConversationChain({ llm: model, memory });
  console.log('Memory Initialized:', memory);

  try {
    // Store user message in chat history
    await memory.chatHistory.addMessage(new HumanMessage(prompt));

    // Invoke model
    const res1 = await chain.invoke({ input: prompt });
    console.log('Model Response:', res1);

    const reply = res1?.response || 'No reply generated';

    try {
      const paymentResult =
        await paymentController.incrementPromptsUsed(userId);

      if (!paymentResult.success) {
        return { success: false, message: paymentResult.message };
      }
    } catch (error) {
      console.error('Error in incrementPromptsUsed:', error);

      // Send the full error message as a response
      return {
        success: false,
        message:
          error.message || 'An error occurred while updating prompt usage.',
      };
    }

    // Store AI response in chat history
    await memory.chatHistory.addMessage(new AIMessage(reply));

    // Save response in the database
    const responseData = {
      prompt,
      model: 'llama3-8b-8192',
      reply,
      total_time: res1?.usage?.total_time || 0,
    };

    let llamaSession = await Llama.findOne({ user: userId, sessionId });

    if (llamaSession) {
      console.log('Existing Session Found:', llamaSession);
      llamaSession?.responses?.push(responseData);
      await llamaSession.save();
      console.log('Updated Session:', llamaSession);
    } else {
      console.log('Creating New Session...');
      llamaSession = await Llama.create({
        user: userId,
        sessionId,
        responses: [responseData],
      });
      console.log('New Session Created:', llamaSession);
      await UserModel.findByIdAndUpdate(userId, {
        $push: { llamaAiSessions: llamaSession._id },
      });
    }

    const data = {
      sessionId,
      prompt,
      reply,
    };
    return data;
  } catch (error) {
    return error;
  }
};

const MAX_MEMORY_SIZE = 12; // Limits stored messages per session
const AnonymousSessionMemoryStore = {}; // Stores session memory for each user session

const GroqAiGetResponseAnonymousService = async (
  prompt,
  sessionIdFromClient,
) => {
  const sessionId = sessionIdFromClient || randomUUID(); // Unique session ID if not provided

  if (!prompt) {
    throw ApiError(httpStatus.NOT_FOUND, 'Prompt is required.');
  }

  // Initialize memory if it doesn't exist
  if (!AnonymousSessionMemoryStore[sessionId]) {
    AnonymousSessionMemoryStore[sessionId] = new BufferMemory({
      returnMessages: true,
      memoryKey: 'history',
      chatHistory: new InMemoryChatMessageHistory(), // Chat history storage
    });
  }
  const memory = AnonymousSessionMemoryStore[sessionId];

  // Retrieve previous chat history
  const previousMessages = await memory.chatHistory.getMessages();

  // Limit memory size to prevent excessive context
  if (previousMessages.length > MAX_MEMORY_SIZE) {
    memory.chatHistory.messages = previousMessages.slice(-MAX_MEMORY_SIZE);
  }

  // Fetch real-time search results from Serper
  const searchResults = await fetchSearchResults(prompt);
  const searchContext = searchResults
    .map((result, index) => `${index + 1}. ${result.title}: ${result.link}`)
    .join('\n');

  // Prepare conversation context (previous memory + search results)
  const enrichedPrompt = searchResults.length
    ? `Previous Conversation:\n${previousMessages
        .map(msg => `${msg._getType().toUpperCase()}: ${msg.text}`)
        .join(
          '\n',
        )}\n\nReal-Time Search Info:\n${searchContext}\n\nUser Query: ${prompt}`
    : `Previous Conversation:\n${previousMessages
        .map(msg => `${msg._getType().toUpperCase()}: ${msg.text}`)
        .join('\n')}\n\nUser Query: ${prompt}`;

  // Initialize the Groq model with LangChain
  const model = new ChatGroq({
    model: 'llama3-8b-8192',
    temperature: 0.7,
    apiKey: config.groq_api_key,
  });

  const chain = new ConversationChain({ llm: model, memory });

  // Add the new user message
  await memory.chatHistory.addMessage(new HumanMessage(prompt));

  // Invoke AI model with full conversation context
  const response = await chain.invoke({ input: enrichedPrompt });

  const reply = response?.response || 'No reply generated';

  // Store AI response in chat history
  await memory.chatHistory.addMessage(new AIMessage(reply));

  // Prepare response
  const responseData = {
    sessionId,
    prompt,
    reply,
    search_results: searchResults, // Include search results in response
  };

  return responseData;
};

const getAiResponsesByUserId = async userId => {
  const sessionData = await UserModel.findOne({
    _id: userId,
  })
    .select('email profile')
    .populate({
      path: 'llamaAiSessions',
    });
  console.log(sessionData, 'sessionData');
  if (!sessionData) {
    return {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: 'Session not found',
      reply: sessionData,
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
      response: sessionData,
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
  getAiResponsesGroqService,
  GroqAiGetResponseAnonymousService,
  getAiResponsesByUserId,
  getAiResponsesBySession,
  deleteOneLlamaAiSession,
  deleteAllAiSessionsService,
};
