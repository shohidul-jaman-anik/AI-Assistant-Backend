import httpStatus from 'http-status';
import ApiError from '../../../errors/ApiError.js';
import catchAsync from '../../../shared/catchAsync.js';
import sendResponse from '../../../shared/sendResponse.js';
import validatePromptRequest from '../../../shared/validatePromptRequest.js';
import { BrowserUseServices } from './browserUse.service.js';

const browserUseRunTask = catchAsync(async (req, res) => {
  const { prompt, userId, sessionId } = await validatePromptRequest(req);
  const result = await BrowserUseServices.browserUseRunTaskService(
    prompt,
    userId,
    sessionId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Successfully.',
    data: result,
  });
});

const getBrowserUseTaskByID = catchAsync(async (req, res) => {
  const taskId = req.params.taskId;
  const result =
    await BrowserUseServices.browserUseGetTaskStatusService(taskId);

  if (result.status === 'completed') {
    // send normal response
  } else if (result.status === 'stopped') {
    // maybe return partial data with a warning
    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: false,
      message: 'Task was stopped before completion.',
      data: result,
    });
    return;
  } else {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Task is not completed yet.');
  }
});

export const BrowserUseController = {
  browserUseRunTask,
  getBrowserUseTaskByID,
};
