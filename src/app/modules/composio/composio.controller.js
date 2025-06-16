import { OpenAIToolSet } from 'composio-core';
import httpStatus from 'http-status';
import config from '../../../../config/index.js';
import sendResponse from '../../../shared/sendResponse.js';
import { composioService } from './composio.service.js';
// import { ChatOpenAI } from "@langchain/openai";
// import { AgentExecutor, createOpenAIFunctionsAgent } from "langchain/agents";
// import { pull } from "langchain/hub";
// import { LangchainToolSet } from "@composio/langchain";

const integrationId = '5c9834e1-14b3-4c06-9262-606bce538a9f'; // Put your Composio Gmail integration ID here
const linkedInIntegrationId = 'ff2c1c00-03ca-4135-9fe7-afa775098c26'; // Put your Composio Gmail integration ID here
const entityId = 'default';

// Start OAuth flow: redirect user to Google's consent page
const startOAuth = async (req, res) => {
  try {
    const redirectUrl = await composioService.getOAuthRedirectUrlService(
      integrationId,
      entityId,
    );
    res.redirect(redirectUrl);
  } catch (err) {
    console.error('Error starting OAuth:', err);
    res.status(500).send('Failed to start OAuth flow');
  }
};

// Handle OAuth callback: exchange code for tokens and get connected account
const handleCallback = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).send('Missing code in callback');

    const connectedAccount = await composioService.exchangeCodeService(
      code,
      integrationId,
      entityId,
    );

    // Save connectedAccount.connectedAccountId to DB/session in production
    res.send(
      `Connected! Your account ID: ${connectedAccount.connectedAccountId}`,
    );
  } catch (err) {
    console.error('Error handling OAuth callback:', err);
    res.status(500).send('Failed to complete OAuth callback');
  }
};

// Send email via Composio with connected Gmail account
const sendEmail = async (req, res) => {
  try {
    const { connectedAccountId, to, subject, body } = req.body;
    if (!connectedAccountId || !to || !subject || !body) {
      return res.status(400).send('Missing required fields');
    }

    const result = await composioService.sendEmailService(
      connectedAccountId,
      entityId,
      {
        to,
        subject,
        body,
      },
    );

    res.json({ success: true, result });
  } catch (err) {
    console.error('Error sending email:', err);
    res.status(500).send('Failed to send email');
  }
};

const startLinkedInOAuth = async (req, res) => {
  try {
    const redirectUrl = await composioService.getOAuthRedirectUrlService(
      linkedInIntegrationId,
      entityId,
    );
    res.redirect(redirectUrl);
  } catch (err) {
    console.error('LinkedIn OAuth Start Error:', err);
    res.status(500).send('Failed to start LinkedIn OAuth flow');
  }
};

const handleLinkedInCallback = async (req, res) => {
  try {
    const { code } = req.query;
    if (!code) return res.status(400).send('Missing code in callback');

    const connectedAccount = await composioService.exchangeCodeService(
      code,
      linkedInIntegrationId,
      entityId,
    );

    res.send(
      `LinkedIn Connected! Account ID: ${connectedAccount.connectedAccountId}`,
    );
  } catch (err) {
    console.error('LinkedIn Callback Error:', err);
    res.status(500).send('Failed to complete LinkedIn OAuth callback');
  }
};

const postToLinkedIn = async (req, res) => {
  try {
    const { connectedAccountId, content } = req.body;
    if (!connectedAccountId || !content) {
      return res.status(400).send('Missing required fields');
    }

    const result = await composioService.postToLinkedInService(
      linkedInIntegrationId,
      connectedAccountId,
      content,
    );

    sendResponse(res, {
      statusCode: httpStatus.OK,
      success: true,
      message: 'Post created successfully on LinkedIn',
      data: result,
    });
  } catch (err) {
    console.error('LinkedIn Post Error:', err);
    res.status(500).send('Failed to post on LinkedIn');
  }
};

const toolset = new OpenAIToolSet({
  apiKey: config.composio.apiKey,
});

const getGmailIntegration = async (req, res) => {
  try {
    const integration = await toolset.integrations.get({
      integrationId: '9716ebb0-5dfa-420c-9033-2cae4f5b61ae',
    });

    const inputFields = await toolset.integrations.getRequiredParams({
      integrationId: integration.id,
    });
    res.json({ integration, inputFields });
  } catch (err) {
    console.error('🔥 Composio error:', err);
    return res.status(500).json({
      error: err.message,
      details: err?.response?.data || err.stack,
    });
  }
};

const initiateGmailConnection = async (req, res) => {
  try {
    const connectedAccount = await toolset.connectedAccounts.initiate({
      integrationId: '9716ebb0-5dfa-420c-9033-2cae4f5b61ae', // Gmail
      entityId: 'default', // or user ID if multi-user
    });

    res.json({
      redirectUrl: connectedAccount.redirectUrl, // 🔁 Send user to this URL to authorize
      connectedAccountId: connectedAccount.connectedAccountId,
      connectionStatus: connectedAccount.connectionStatus,
    });
  } catch (err) {
    console.error('🔥 Composio error:', err);
    return res.status(500).json({
      error: err.message,
      details: err?.response?.data || err.stack,
    });
  }
};

// const sendEmailViaGmail = async (req, res) => {
//   const apiKey = config.composio.apiKey;
//   const integrationId = '9716ebb0-5dfa-420c-9033-2cae4f5b61ae';
//   const connectedAccountId = '4a4b2384-e251-46f4-ad8d-413e8eab16e2';
//   const connectorId = 'gmail';

//   const payload = {
//     integrationId,
//     connectedAccountId,
//     connectorId,
//     action: 'GMAIL_SEND_EMAIL',
//     input: {
//       to: 'anikh561460@gmail.com',
//       subject: 'Hello from Composio',
//       body: 'This email was sent using Composio Gmail integration!',
//       is_html: false,
//     },
//   };

//   try {
//     const response = await axios.post(
//       'https://api.composio.dev/v1/actions/execute',
//       payload,
//       {
//         headers: {
//           Authorization: `Bearer ${apiKey}`,
//           'Content-Type': 'application/json',
//         },
//       },
//     );
//     console.log('Email sent:', response.data);
//     return res.status(200).json(response.data);
//   } catch (err) {
//     console.error('🔥 Composio error:', err);
//     return res.status(500).json({
//       error: err.message,
//       details: err?.response?.data || err.stack || err.message,
//     });
//   }
// };

// const sendEmailViaGmail = async (req, res) => {
//   try {
//     // 1. Initialize LLM
//     const llm = new ChatOpenAI({
//       model: 'gpt-4-turbo',
//       temperature: 0,
//     });

//     // 2. Get the pre-defined agent prompt
//     const prompt = await pull('hwchase17/openai-functions-agent');

//     // 3. Set up Composio tools
//     const toolset = new LangchainToolSet({
//       apiKey: config.composio.apiKey, // Use from config, not hardcoded
//       integrationId: '9716ebb0-5dfa-420c-9033-2cae4f5b61ae',
//       connectedAccountId: '4a4b2384-e251-46f4-ad8d-413e8eab16e2',
//     });

//     // 4. Get specific tools you need
//     const tools = await toolset.getTools({
//       actions: ['GMAIL_SEND_EMAIL'],
//     });

//     // 5. Create agent
//     const agent = await createOpenAIFunctionsAgent({
//       llm,
//       tools,
//       prompt,
//     });

//     // 6. Execute agent
//     const agentExecutor = new AgentExecutor({
//       agent,
//       tools,
//       verbose: true,
//     });

//     // 7. Invoke with your email task
//     const response = await agentExecutor.invoke({
//       input: `Send email to anikh561460@gmail.com with subject "Hello from Composio" and body "This email was sent using Composio LangChain integration!"`,
//     });

//     console.log('Email sent successfully:', response);
//     return res.status(200).json(response);
//   } catch (error) {
//     console.error('Error in Composio LangChain integration:', error);
//     return res.status(500).json({
//       error: 'Failed to send email',
//       details: error.message,
//       stack: error.stack,
//     });
//   }
// };

const sendEmailViaGmail = async (req, res) => {
  try {
    const { connectedAccountId, to, subject, message } = req.body;

    // Validation
    if (!connectedAccountId || !to || !subject || !message) {
      return res.status(400).json({
        error:
          'Missing required fields: connectedAccountId, to, subject, message',
      });
    }
    console.log(toolset, 'toolset');
    console.log(Object.keys(toolset.actions));
    const actions = await toolset.actions.list();
    console.log(actions);
    // Invoke Gmail send email action
    // const response = await toolset.client.actions.invokeAction({
    //   connectedAccountId,
    //   integrationId: '9716ebb0-5dfa-420c-9033-2cae4f5b61ae', // Gmail integration ID
    //   operationId: 'sendEmail',
    //   params: {
    //     to,
    //     subject,
    //     body: message,
    //   },
    // });
    const response = await toolset.performAction({
      connectedAccountId,
      integrationId: '9716ebb0-5dfa-420c-9033-2cae4f5b61ae', // Gmail
      operationId: 'sendEmail', // This must match what Composio defines
      params: {
        to,
        subject,
        body: message, // ✅ Use "body" not "message"
      },
    });

    res.json({
      success: true,
      response,
    });
  } catch (err) {
    console.error('🔥 Composio error:', err);
    return res.status(500).json({
      error: err.message,
      details: err?.response?.data || err.stack,
    });
  }
};

export const composioController = {
  startOAuth,
  handleCallback,
  sendEmail,
  startLinkedInOAuth,
  handleLinkedInCallback,
  postToLinkedIn,
  getGmailIntegration,
  initiateGmailConnection,
  sendEmailViaGmail,
};
