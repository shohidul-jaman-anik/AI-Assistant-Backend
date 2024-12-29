const axios = require('axios');
const httpStatus = require('http-status');
const { sendResponse } = require('../../../shared/sendResponse');
const { catchAsync } = require('../../../shared/catchAsync');
const config = require('../../../../config');
const Groq = require('groq-sdk');
const Llama = require('./groq.model');

const groq = new Groq({ apiKey: config.groq_api_key });

exports.GroqAiGetResponse = catchAsync(async (req, res) => {
  // Fetch chat completion from the Groq SDK
  const prompt = req.body?.prompt;

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
  const message =
    response.choices[0]?.message?.content || 'No response generated.';
  const total_time = response.usage?.total_time || 0;

  // Validate the extracted content
  if (!message) {
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
  const resData = await Llama.create({ prompt, model, message, total_time });

  // Send the response back to the client
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Send response successfully',
    data: resData,
  });
});
