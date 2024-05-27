
const axios = require('axios');
const httpStatus = require('http-status');
const { sendResponse } = require('../../../shared/sendResponse');
const { catchAsync } = require('../../../shared/catchAsync');



exports.OllamaAiGetResponse = catchAsync(async (req, res) => {
    const url = 'http://localhost:11434/api/generate';
    const data = {
        model: 'llama2-uncensored',
        prompt: 'What is water made of?',
        stream: false // Optional parameter
    };


    const response = await axios.post(url, data, {
        headers: {
            'Content-Type': 'application/json'
        }
    });

    if (response.status === 200) {
        console.log('Response:', response.data);
    } else {
        console.error('Error:', response.status, response.statusText);
    }


    sendResponse(res, {
        statusCode: httpStatus.OK,
        success: true,
        message: 'Send response successfully',
        data: response,
    });
});

