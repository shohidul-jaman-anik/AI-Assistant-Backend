import { randomUUID } from 'crypto';
import httpStatus from 'http-status';
import config from '../../../../config/index.js';
import catchAsync from '../../../shared/catchAsync.js';
import sendResponse from '../../../shared/sendResponse.js';
import UserModel from '../auth/auth.model.js';
import axios from 'axios';
import FormData from 'form-data';
import fs from 'fs';



const WishperAiGetResponse = catchAsync(async (req, res) => {
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

  const formData = new FormData();
  formData.append('file', fs.createReadStream(audioFilePath));
  formData.append('model', 'whisper-large-v3'); // Groq supports whisper-compatible models
  formData.append('language', 'en'); // Optional

  try {
    const response = await axios.post(
      'https://api.groq.com/v1/audio/transcriptions',
      formData,
      {
        headers: {
          ...formData.getHeaders(),
          Authorization: `Bearer ${config.groq_api_key}`,
        },
      },
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Response processed successfully.',
      data: { prompt, sessionId, response },
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

export const WishperAiController = {
  WishperAiGetResponse,
};
