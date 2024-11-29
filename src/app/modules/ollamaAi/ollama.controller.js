
const axios = require('axios');
const httpStatus = require('http-status');
const { sendResponse } = require('../../../shared/sendResponse');
const { catchAsync } = require('../../../shared/catchAsync');



exports.OllamaAiGetResponse = catchAsync(async (req, res) => {
    // const { prompt } = req.body;  // Expecting a JSON body with a "prompt" field
    // console.log(prompt,'prompt')
    // if (!prompt) {
    //     return sendResponse(res, {
    //         statusCode: httpStatus.BAD_REQUEST,
    //         success: false,
    //         message: 'Prompt is required',
    //     });
    // }
    // const url = 'http://localhost:11434/api/generate';
    // const data = {
    //     model: "llama3",
    //     prompt,
    //     stream: false
    // };


    // const response = await axios.post(url, data, {
    //     headers: {
    //         'Content-Type': 'application/json'
    //     }
    // });

    // if (response.status === 200) {
    //     console.log('Response:', response.data);
    // } else {
    //     console.error('Error:', response.status, response.statusText);
    // }


    // sendResponse(res, {
    //     statusCode: httpStatus.OK,
    //     success: true,
    //     message: 'Send response successfully',
    //     data: response,
    // });


    const query = req.body.prompt;

    if (!query) {
        return sendResponse(res, {
            statusCode: httpStatus.BAD_REQUEST,
            success: false,
            message: 'Prompt is required',
        });
    }
    const url = 'http://localhost:11434/api/generate';
    const data = {
        model: "llama3",
        prompt: query,
        stream: false
    };

    try {
        const response = await axios.post(url, data, {
            headers: {
                'Content-Type': 'application/json'
            }
        });

        if (response.status === 200) {
            console.log('Response:', response.data);
            sendResponse(res, {
                statusCode: httpStatus.OK,
                success: true,
                message: 'Send response successfully',
                // data: response.data,
                data: response.data
            });
        } else {
            console.error('Error:', response.status, response.statusText);
            sendResponse(res, {
                statusCode: httpStatus.INTERNAL_SERVER_ERROR,
                success: false,
                message: 'Failed to get response from Llama 3 API',
            });
        }
    } catch (error) {
        console.error('Error:', error.message);
        sendResponse(res, {
            statusCode: httpStatus.INTERNAL_SERVER_ERROR,
            success: false,
            message: 'Failed to get response from Llama 3 API',
        });
    }
});

