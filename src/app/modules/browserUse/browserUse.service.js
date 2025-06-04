import axios from 'axios';
import config from '../../../../config/index.js';
import { logger } from '../../../shared/logger.js';

const browserUseRunTaskService = async (prompt, userId, sessionId) => {
  try {
    const response = await axios.post(
      'https://api.browser-use.com/api/v1/run-task',
      {
        task: prompt,
        secrets: {},
        allowed_domains: ['*'],
        actions: ['open_tab', 'search_google', 'click', 'extract_content'],
        starting_url: 'https://www.google.com',
        save_browser_data: true,
        structured_output_json: '{}',
        llm_model: 'llama-4-maverick-17b-128e-instruct',
        use_adblock: true,
        use_proxy: true,
        highlight_elements: true,
      },
      {
        headers: {
          Authorization: `Bearer ${config.browser_use_secret_key}`,
          'Content-Type': 'application/json',
        },
      },
    );
    console.log('Browser Use Response:', response);
    return response.data;
  } catch (error) {
    logger.info(
      'Error in browserUseRunTaskService:',
      error.response?.data || error.message,
    );
    throw error;
  }
};

const browserUseGetTaskStatusService = async taskId => {
  try {
    const response = await axios.get(
      `https://api.browser-use.com/api/v1/task/${taskId}`,
      {
        headers: {
          Authorization: `Bearer ${config.browser_use_secret_key}`,
        },
      },
    );

    console.log('Browser Use Task Status Response:', response.data);
    return response.data;
  } catch (error) {
    logger.info(
      'Error in browserUseGetTaskStatusService:',
      error.response?.data || error.message,
    );
    throw error;
  }
};

export const BrowserUseServices = {
  browserUseRunTaskService,
  browserUseGetTaskStatusService,
};
