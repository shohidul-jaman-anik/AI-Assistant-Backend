import Groq from "groq-sdk";
import { InMemoryChatMessageHistory } from '@langchain/core/chat_history';
import { AIMessage, HumanMessage } from '@langchain/core/messages';
import { randomUUID } from 'crypto';
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync.js';
import sendResponse from '../../../shared/sendResponse.js';
import UserModel from '../auth/auth.model.js';
import Llama from '../groq/groq.model.js';
import { BufferMemory } from 'langchain/memory';

const groq = new Groq(); // Initialize the Groq SDK

const sessionMemoryStore = {};

const DeepseekAiGetResponse = catchAsync(async (req, res) => {
  const { prompt, user: userId, sessionId = randomUUID() } = req.body;

  if (!prompt) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: "Prompt is required.",
    });
  }

  const user = await UserModel.findById(userId);
  if (!user) {
    return sendResponse(res, {
      statusCode: httpStatus.NOT_FOUND,
      success: false,
      message: "User not found.",
    });
  }

  let memory = sessionMemoryStore[sessionId];
  if (!memory) {
    memory = new BufferMemory({
      returnMessages: true,
      memoryKey: "history",
      chatHistory: new InMemoryChatMessageHistory(),
    });
    sessionMemoryStore[sessionId] = memory;
  }

  try {
    await memory.chatHistory.addMessage(new HumanMessage(prompt));

    const startTime = Date.now(); // Record start time

    // Call Groq API to generate a response using the deepseek model
    const completion = await groq.chat.completions.create({
      // model: "deepseek-r1-distill-qwen-32b", // Use the deepseek model
      model: "DeepSeek-R1-Distill-Llama-70B",
      messages: [
        {
          role: "user",
          content: prompt,
        },
      ],
    });

    const endTime = Date.now(); // Record end time
    const totalTime = endTime - startTime; // Calculate total time taken

    const reply = completion.choices[0]?.message?.content || "No reply generated";

    await memory.chatHistory.addMessage(new AIMessage(reply));

    const responseData = {
      prompt,
      model: "deepseek-r1-distill-qwen-32b",
      reply,
      total_time: totalTime, // Add total time to response data
    };

    let deepseekSession = await Llama.findOne({ user: userId, sessionId });

    if (deepseekSession) {
      deepseekSession.responses.push(responseData);
      await deepseekSession.save();
    } else {
      deepseekSession = await Llama.create({
        user: userId,
        sessionId,
        responses: [responseData],
      });
      await UserModel.findByIdAndUpdate(userId, {
        $push: { llamaAiSessions: deepseekSession._id },
      });
    }

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: "Response processed successfully.",
      data: { prompt, sessionId, reply },
    });
  } catch (error) {
    console.error("Error in Groq DeepSeek AI:", error);
    sendResponse(res, {
      statusCode: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
      message: "Failed to get response",
      error: error.message,
    });
  }
});



export const DeepseekAiController = {
  DeepseekAiGetResponse,
};
