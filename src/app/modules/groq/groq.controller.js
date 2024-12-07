const axios = require('axios');
const httpStatus = require('http-status');
const { sendResponse } = require('../../../shared/sendResponse');
const { catchAsync } = require('../../../shared/catchAsync');
const config = require('../../../../config');
const Groq = require('groq-sdk');

const groq = new Groq({ apiKey: config.groq_api_key });

exports.GroqAiGetResponse = catchAsync(async (req, res) => {
  // Fetch chat completion from the Groq SDK
  const prompt = req.body?.prompt;
  const response = await groq.chat.completions.create({
    messages: [
      {
        role: 'user',
        content: prompt,
      },
    ],
    model: 'llama3-8b-8192',
  });

  // Extract the content from the response
  const content =
    response.choices[0]?.message?.content || 'No response generated.';

  // Send the response back to the client
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Send response successfully',
    data: { content },
  });
});
