import { OpenAIToolSet } from 'composio-core';
import httpStatus from 'http-status';
import config from '../../../../config/index.js';

const toolset = new OpenAIToolSet({ apiKey: config.composio.apiKey });

const getOAuthRedirectUrlService = async (integrationId, entityId) => {
  try {
    const connectedAccount = await toolset.connectedAccounts.initiate({
      integrationId,
      entityId,
      redirectUrl: 'http://localhost:5100/api/v1/composio/gmail/auth/callback',
    });
    return connectedAccount.redirectUrl;
  } catch (error) {
    console.error('Error initiating OAuth:', error.message);
    throw new ApiErrorError(
      httpStatus.BAD_REQUEST,
      'Failed to initiate OAuth process.',
    );
  }
};

const exchangeCodeService = async (code, integrationId, entityId) => {
  try {
    const connectedAccount = await toolset.connectedAccounts.exchangeCode({
      code,
      integrationId,
      entityId,
    });
    return connectedAccount;
  } catch (error) {
    console.error('Error exchanging code:', error.message);
    throw new ApiErrorError(
      httpStatus.BAD_REQUEST,
      'Failed to exchange OAuth code.',
    );
  }
};

const sendEmailService = async (connectedAccountId, entityId, emailInputs) => {
  const { to, subject, body } = emailInputs;

  // const integration = await toolset.integrations.get({
  //   integrationId: '5c9834e1-14b3-4c06-9262-606bce538a9f',
  // });
  // const connectedAccount = await toolset.connectedAccounts.initiate({
  //   integrationId: integration.id,
  //   entityId: 'default',
  // });
  const connectedAccount = await toolset.connectedAccounts.getById({
    connectedAccountId,
  });

  if (!connectedAccount?.actions?.sendEmail) {
    throw new Error(
      'sendEmail action not available on this connected account.',
    );
  }

  const response = await connectedAccount.actions.sendEmail({
    entityId,
    to,
    subject,
    body,
  });
  console.log('Email sent successfully:', response);
  return response;
};

// =============================
//      LinkedIn Services
// =============================

const getLinkedInOAuthRedirectUrlService = async (integrationId, entityId) => {
  const connectedAccount = await toolset.connectedAccounts.initiate({
    integrationId,
    entityId,
  });
  return connectedAccount.redirectUrl;
};

const exchangeCodeLinkedInService = async (code, integrationId, entityId) => {
  const connectedAccount = await toolset.connectedAccounts.exchangeCode({
    code,
    integrationId,
    entityId,
  });
  return connectedAccount;
};

const postToLinkedInService = async (
  integrationId,
  connectedAccountId,
  content,
) => {
  const integration = await toolset.integrations.get({
    integrationId: 'ff2c1c00-03ca-4135-9fe7-afa775098c26',
  });
  const expectedInputFields = await toolset.integrations.getRequiredParams(
    integration.id,
  );
  // Collect auth params from your users

  console.log(expectedInputFields);
  return expectedInputFields;
};

export const composioService = {
  getOAuthRedirectUrlService,
  exchangeCodeService,
  sendEmailService,
  getLinkedInOAuthRedirectUrlService,
  exchangeCodeLinkedInService,
  postToLinkedInService,
};
