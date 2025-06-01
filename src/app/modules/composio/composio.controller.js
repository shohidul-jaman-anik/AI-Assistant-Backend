import httpStatus from 'http-status';
import sendResponse from '../../../shared/sendResponse.js';
import { composioService } from './composio.service.js';

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

export const composioController = {
  startOAuth,
  handleCallback,
  sendEmail,
  startLinkedInOAuth,
  handleLinkedInCallback,
  postToLinkedIn,
};
