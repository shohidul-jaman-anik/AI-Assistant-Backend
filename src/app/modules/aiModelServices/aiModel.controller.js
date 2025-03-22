import aiEndpoints from './aiModel.utils.js';

const getAiSocketEndpoint = async (req, res) => {
  try {
    res.status(200).json({
      status: 'Success',
      message: 'Get aiSocketEndpoint successfully',
      anonymously:'/groq/get-response-anonymously',
      data: aiEndpoints,
    });
  } catch (error) {
    res.status(400).json({
      status: 'fail',
      message: "Couldn't not get aiSocketEndpoint",
      error: error.message,
    });
  }
};

export const AiEndpointsController = {
  getAiSocketEndpoint,
};
