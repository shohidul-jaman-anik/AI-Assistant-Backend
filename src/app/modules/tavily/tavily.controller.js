import { tavily } from '@tavily/core';
import httpStatus from 'http-status';
import config from '../../../../config/index.js';
import catchAsync from '../../../shared/catchAsync.js';
import sendResponse from '../../../shared/sendResponse.js';

const TavilyAiGetResponseAnonymously = catchAsync(async (req, res) => {
  const prompt = req.body?.prompt;
  const tvly = tavily({ apiKey: config.tavily_api_key });

  if (!prompt) {
    return sendResponse(res, {
      statusCode: httpStatus.BAD_REQUEST,
      success: false,
      message: 'Validation Error',
      errorMessages: [{ path: 'prompt', message: 'Prompt is required.' }],
    });
  }
    // Perform the Tavily search
    const response = await tvly.search(prompt, { 
        maxResults: 1, 
        includeImages: true
      });
    

  // Extract first image (if available)
  const image = response?.images?.length ? response.images[0] : null;

  // Keep only relevant fields
  const responseData = {
    prompt,
    results: response?.results?.map(result => ({
      title: result?.title,
      url: result?.url,
      content: result?.content,
      rawContent: result?.rawContent,
      score: result.score,
      image: image ? { url: image?.url, description: image?.description || "No description" } : null
    }))
  };



  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Response processed successfully.',
    data: responseData,
  });
});

export const TavilyAiController = {
  TavilyAiGetResponseAnonymously,
};
