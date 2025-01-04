const axios = require('axios');
const httpStatus = require('http-status');
const { sendResponse } = require('../../../shared/sendResponse');
const { catchAsync } = require('../../../shared/catchAsync');
const config = require('../../../../config');
const Groq = require('groq-sdk');
const Llama = require('./groq.model');
const UserModel = require('../auth/auth.model');
const {
  getAiResponsesBySession,
  getAiResponsesByUserId,
} = require('./groq.service');

const groq = new Groq({ apiKey: config.groq_api_key });

exports.GroqAiGetResponse = catchAsync(async (req, res) => {
  // Fetch chat completion from the Groq SDK
  const prompt = req.body?.prompt;
  const userId = req.body?.user;
  const sessionId = req.body?.sessionId;

  if (!prompt) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'Validation Error',
      errorMessages: [
        {
          path: 'prompt',
          message: 'Prompt is required.',
        },
      ],
    });
  }

  const user = await UserModel.findOne({ _id: userId });

  if (!user) {
    return sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Send response successfully',
      data: reply,
    });
  }

  // Fetch chat completion from the Groq SDK
  const response = await groq.chat.completions.create({
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    model: 'llama3-8b-8192',
  });

  console.log(response, 'responseeeeeeee');

  // Extract the required details from the response
  const model = response.model;
  const reply =
    response.choices[0]?.message?.content || 'No response generated.';
  const total_time = response.usage?.total_time || 0;

  // Validate the extracted content
  if (!reply) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'Validation Error',
      errorMessages: [
        {
          path: 'content',
          message: 'Path `content` is required.',
        },
      ],
    });
  }

  // Store the response data in the database
  const resData = await Llama.create({ prompt, model, reply, total_time });

  // Send the response back to the client
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Send response successfully',
    data: reply,
  });
});

exports.LlamaAiGetResponseFromDbByUserId = catchAsync(async (req, res) => {
  const id = req.params?.userId;
  console.log(id, 'session');

  const responseData = await getAiResponsesByUserId(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Get Response successfully',
    data: responseData,
  });
});

exports.LlamaAiGetResponseFromDbBySessionId = catchAsync(async (req, res) => {
  const id = req.params?.sessionId;
  console.log(id, 'session');

  const responseData = await getAiResponsesBySession(id);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Get Response successfully',
    data: responseData,
  });
});
