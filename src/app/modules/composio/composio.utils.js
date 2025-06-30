import config from '../../../../config/index.js';

export const ComposioHeaders = {
  'x-api-key': config.composio.apiKey,
  'Content-Type': 'application/json',
};
