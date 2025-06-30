import axios from 'axios';
import { OpenAIToolSet } from 'composio-core';
import config from '../../../../config/index.js';
import ApiError from '../../../errors/ApiError.js';
import {
  githubIntegrationId,
  googlemeetIntegrationId,
  slackIntegrationId,
  twitterIntegrationId,
  youtubeIntegrationId,
} from './composio.constant.js';
import { composioHelper } from './composio.helper.js';

const toolset = new OpenAIToolSet({ apiKey: config.composio.apiKey });
const headers = {
  'x-api-key': config.composio.apiKey,
  'Content-Type': 'application/json',
};
const getGmailIntegrationService = async () => {
  const integration = await toolset.integrations.get({
    integrationId: '9716ebb0-5dfa-420c-9033-2cae4f5b61ae',
  });

  const inputFields = await toolset.integrations.getRequiredParams({
    integrationId: integration.id,
  });
  const data = { integration, inputFields };
  return data;
};

const initiateGmailConnectionService = async integrationId => {
  const connectedAccount = await toolset.connectedAccounts.initiate({
    integrationId,
    entityId: 'default', // or user ID if multi-user
  });

  const data = {
    redirectUrl: connectedAccount.redirectUrl, // 🔁 Send user to this URL to authorize
    connectedAccountId: connectedAccount.connectedAccountId,
    connectionStatus: connectedAccount.connectionStatus,
  };
  return data;
};

const sendEmailService = async req => {
  const {
    integrationId,
    connectedAccountId,
    to,
    subject,
    message,
    isHtml = false,
  } = req.body;

  if (!connectedAccountId || !to || !subject || !message) {
    // return res.status(400).json({
    //   error:
    //     'Missing required fields: connectedAccountId, to, subject, message',
    // });
    throw new ApiError(
      400,
      'Missing required fields: connectedAccountId, to, subject, message',
    );
  }

  const actionId = 'GMAIL_SEND_EMAIL';
  const url = `https://backend.composio.dev/api/v2/actions/${actionId}/execute`;

  const response = await axios.post(
    url,
    {
      integrationId,
      connectedAccountId,
      input: {
        user_id: 'me',
        recipient_email: to,
        subject,
        body: message,
        is_html: isHtml,
      },
    },
    {
      headers,
    },
  );

  const data = {
    success: true,
    data: response.data,
  };
  return data;
};

// =============================
//      Youtub Services
// =============================

const getYouTubeIntegrationService = async () => {
  const integration = await toolset.integrations.get({
    integrationId: youtubeIntegrationId,
  });

  const inputFields = await toolset.integrations.getRequiredParams({
    integrationId: integration.id,
  });

  return { integration, inputFields };
};
const initiateYouTubeConnectionService = async () => {
  const connectedAccount = await toolset.connectedAccounts.initiate({
    integrationId: youtubeIntegrationId,
    entityId: 'default',
  });

  return {
    redirectUrl: connectedAccount.redirectUrl,
    connectedAccountId: connectedAccount.connectedAccountId,
    connectionStatus: connectedAccount.connectionStatus,
  };
};

const searchYouTubeService = async req => {
  const { connectedAccountId, query } = req.body;

  if (!connectedAccountId || !query) {
    throw new ApiError(
      400,
      'Missing required fields: connectedAccountId, and query',
    );
  }

  const actionId = 'YOUTUBE_SEARCH_YOU_TUBE';
  const url = `https://backend.composio.dev/api/v2/actions/${actionId}/execute`;

  const response = await axios.post(
    url,
    {
      integrationId: youtubeIntegrationId,
      connectedAccountId,
      input: {
        q: query, // ✅ FIXED HERE
      },
    },
    {
      headers,
    },
  );

  return response.data;
};
const disconnectYouTubeAccountService = async connectedAccountId => {
  const response = await toolset.connectedAccounts.delete({
    connectedAccountId,
  });

  return {
    success: true,
    message: 'Disconnected successfully',
    response,
  };
};

// =============================
//      Twitter Services
// =============================

const initiateTwitterConnectionService = async () => {
  const connectedAccount = await toolset.connectedAccounts.initiate({
    integrationId: twitterIntegrationId,
    entityId: 'default',
  });

  return {
    redirectUrl: connectedAccount.redirectUrl,
    connectedAccountId: connectedAccount.connectedAccountId,
    connectionStatus: connectedAccount.connectionStatus,
  };
};

const postTweetService = async req => {
  const { connectedAccountId, text } = req.body;

  if (!connectedAccountId || !text) {
    return { error: 'Missing required fields: connectedAccountId, text' };
  }

  const actionId = 'TWITTER_CREATION_OF_A_POST';
  const url = `https://backend.composio.dev/api/v2/actions/${actionId}/execute`;

  const response = await axios.post(
    url,
    {
      integrationId: twitterIntegrationId,
      connectedAccountId,
      input: { text },
    },
    {
      headers,
    },
  );

  return {
    success: true,
    data: response.data,
  };
};
const deleteTweetService = async req => {
  const { connectedAccountId, tweetId } = req.body;

  if (!connectedAccountId || !tweetId) {
    return { error: 'Missing required fields: connectedAccountId, tweetId' };
  }

  const actionId = 'TWITTER_POST_DELETE_BY_POST_ID';
  const url = `https://backend.composio.dev/api/v2/actions/${actionId}/execute`;

  const response = await axios.post(
    url,
    {
      integrationId: twitterIntegrationId,
      connectedAccountId,
      input: {
        post_id: tweetId,
      },
    },
    {
      headers,
    },
  );

  return { success: true, data: response.data };
};
const getTwitterUserId = async (connectedAccountId, username) => {
  const url = `https://backend.composio.dev/api/v2/actions/TWITTER_USER_LOOKUP_BY_USERNAMES/execute`;

  const response = await axios.post(
    url,
    {
      integrationId: twitterIntegrationId,
      connectedAccountId,
      input: {
        usernames: [username],
        user__fields: ['id', 'name', 'username'],
      },
    },
    {
      headers,
    },
  );
  console.log(response, 'Response from Twitter API:');

  const userData = response.data?.data?.data?.[0];
  if (!userData?.id) throw new Error('User ID not found');
  return userData.id;
};

const followTwitterUserService = async req => {
  const { connectedAccountId, username } = req.body;

  if (!connectedAccountId || !username) {
    return { error: 'Missing required fields: connectedAccountId, username' };
  }

  // 1. Get authenticated (source) Twitter user ID
  const authenticatedUserId =
    await composioHelper.getAuthenticatedTwitterUserId(connectedAccountId);

  // 2. Get target Twitter user ID from username
  const targetUserId = await getTwitterUserId(connectedAccountId, username);

  console.log('Authenticated User ID:', authenticatedUserId);
  console.log('Target User ID:', targetUserId);
  console.log('Connected Account ID:', connectedAccountId);

  // 3. Call Follow action
  const followUrl = `https://backend.composio.dev/api/v2/actions/TWITTER_FOLLOW_USER/execute`;

  const response = await axios.post(
    followUrl,
    {
      integrationId: twitterIntegrationId,
      connectedAccountId,
      input: {
        id: authenticatedUserId, // ✅ Authenticated Twitter ID
        target_user_id: targetUserId, // ✅ Target Twitter ID
      },
    },
    {
      headers,
    },
  );

  return { success: true, data: response.data };
};
const getTwitterUserByUsernameService = async req => {
  const { connectedAccountId, username } = req.body;

  if (!connectedAccountId || !username) {
    return { error: 'Missing required fields: connectedAccountId, username' };
  }

  const actionId = 'TWITTER_USER_LOOKUP_BY_USERNAMES';
  const url = `https://backend.composio.dev/api/v2/actions/${actionId}/execute`;

  const response = await axios.post(
    url,
    {
      integrationId: twitterIntegrationId,
      connectedAccountId,
      input: { usernames: [username] }, // note: array of usernames expected
    },
    {
      headers,
    },
  );

  return { success: true, data: response.data };
};

const getUserIdFromUsername = async (connectedAccountId, username) => {
  const actionId = 'TWITTER_USER_LOOKUP_BY_USERNAMES';
  const url = `https://backend.composio.dev/api/v2/actions/${actionId}/execute`;

  const response = await axios.post(
    url,
    {
      integrationId: twitterIntegrationId,
      connectedAccountId,
      input: { usernames: [username] },
    },
    {
      headers,
    },
  );
  console.log(
    'Response from Twitter API:',
    JSON.stringify(response.data, null, 2),
  );

  const users = response.data.data.data;
  if (users && users.length > 0) {
    return users[0].id;
  }
  throw new Error('User not found');
};

// Step 2: Send DM by user ID (participant_id)
const sendDMByUsernameService = async req => {
  const { connectedAccountId, username, text } = req.body;

  if (!connectedAccountId || !username || !text) {
    return {
      error: 'Missing required fields: connectedAccountId, username, text',
    };
  }

  try {
    const participant_id = await getUserIdFromUsername(
      connectedAccountId,
      username,
    );

    const actionId = 'TWITTER_SEND_A_NEW_MESSAGE_TO_A_USER';
    const url = `https://backend.composio.dev/api/v2/actions/${actionId}/execute`;

    const response = await axios.post(
      url,
      {
        integrationId: twitterIntegrationId,
        connectedAccountId,
        input: {
          participant_id, // Use participant_id instead of target_user_id
          text,
        },
      },
      {
        headers,
      },
    );

    return { success: true, data: response.data };
  } catch (error) {
    return { error: error.message };
  }
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

// =============================
//   Google Calender Services
// =============================

const calendarIntegrationId = '21c69c18-54ef-464b-a181-dc82f3e5b089';
const initiateGoogleCalendarConnectionService = async () => {
  const connectedAccount = await toolset.connectedAccounts.initiate({
    integrationId: calendarIntegrationId,
    entityId: 'default',
  });

  return {
    redirectUrl: connectedAccount.redirectUrl,
    connectedAccountId: connectedAccount.connectedAccountId,
    connectionStatus: connectedAccount.connectionStatus,
  };
};
const createCalendarEventService = async req => {
  const {
    connectedAccountId,
    summary,
    description,
    startTime,
    endTime,
    timezone = 'Asia/Dhaka',
  } = req.body;

  if (!connectedAccountId || !summary || !startTime || !endTime) {
    return {
      error:
        'Missing required fields: connectedAccountId, summary, startTime, endTime',
    };
  }

  const actionId = 'GOOGLECALENDAR_CREATE_EVENT';
  const url = `https://backend.composio.dev/api/v2/actions/${actionId}/execute`;

  const response = await axios.post(
    url,
    {
      integrationId: calendarIntegrationId,
      connectedAccountId,
      input: {
        summary,
        description,
        start_datetime: startTime,
        end_datetime: endTime,
        timezone,
      },
    },
    {
      headers,
    },
  );

  return {
    success: true,
    data: response.data,
  };
};

const getCalendarEventsService = async req => {
  const { connectedAccountId } = req.body;

  if (!connectedAccountId) {
    return { error: 'Missing required field: connectedAccountId' };
  }

  const actionId = 'GOOGLECALENDAR_EVENTS_LIST';
  const url = `https://backend.composio.dev/api/v2/actions/${actionId}/execute`;

  const response = await axios.post(
    url,
    {
      integrationId: calendarIntegrationId,
      connectedAccountId,
      input: {
        calendarId: 'primary', // Use 'primary' for main calendar
      },
    },
    {
      headers,
    },
  );

  return response.data;
};
const deleteCalendarEventService = async req => {
  const { connectedAccountId, eventId, calendarId = 'primary' } = req.body;

  if (!connectedAccountId || !eventId) {
    return {
      error: 'Missing required fields: connectedAccountId, eventId',
    };
  }

  const actionId = 'GOOGLECALENDAR_DELETE_EVENT';
  const url = `https://backend.composio.dev/api/v2/actions/${actionId}/execute`;

  const response = await axios.post(
    url,
    {
      integrationId: calendarIntegrationId,
      connectedAccountId,
      input: {
        event_id: eventId,
        calendar_id: calendarId,
      },
    },
    {
      headers,
    },
  );

  return response.data;
};
const updateCalendarEventService = async req => {
  const {
    connectedAccountId,
    eventId,
    calendarId = 'primary',
    summary,
    description,
    startTime,
    endTime,
    timezone = 'Asia/Dhaka',
  } = req.body;

  if (!connectedAccountId || !eventId) {
    return { error: 'Missing required fields: connectedAccountId, eventId' };
  }

  const actionId = 'GOOGLECALENDAR_PATCH_EVENT';
  const url = `https://backend.composio.dev/api/v2/actions/${actionId}/execute`;

  const response = await axios.post(
    url,
    {
      integrationId: calendarIntegrationId,
      connectedAccountId,
      input: {
        calendar_id: calendarId,
        event_id: eventId,
        summary, // optional
        description, // optional
        start_time: startTime, // optional
        end_time: endTime, // optional
        timezone, // optional
      },
    },
    {
      headers: {
        'x-api-key': config.composio.apiKey,
        'Content-Type': 'application/json',
      },
    },
  );

  return response.data;
};

// =============================
//      GItHub Services
// =============================

const getGithubIntegrationService = async () => {
  const integration = await toolset.integrations.get({
    integrationId: githubIntegrationId,
  });

  const inputFields = await toolset.integrations.getRequiredParams({
    integrationId: integration.id,
  });

  return { integration, inputFields };
};

const initiateGithubConnectionService = async integrationId => {
  const connectedAccount = await toolset.connectedAccounts.initiate({
    integrationId: integrationId,
    entityId: 'default', // Ideally use a real user ID here
  });
  return {
    redirectUrl: connectedAccount.redirectUrl,
    connectedAccountId: connectedAccount.connectedAccountId,
    connectionStatus: connectedAccount.connectionStatus,
  };
};

// const createGitHubRepoService = async req => {
//   const { connectedAccountId, name, owner, repo, body } = req.body;

//   if (!connectedAccountId || !name || !owner || !repo) {
//     throw new ApiError(
//       400,
//       'Missing required fields: connectedAccountId, name, owner, repo',
//     );
//   }

//   const actionId = 'GITHUB_CREATE_A_REPOSITORY_PROJECT';

//   const response = await axios.post(
//     `https://backend.composio.dev/api/v2/actions/${actionId}/execute`,
//     {
//       integrationId: githubIntegrationId,
//       connectedAccountId,
//       input: {
//         name,
//         owner,
//         repo,
//         body: body ?? '', // optional field
//       },
//     },
//     {
//       headers: {
//         'x-api-key': config.composio.apiKey,
//         'Content-Type': 'application/json',
//       },
//     },
//   );

//   return response.data;
// };
const createGitHubRepoService = async req => {
  const { integrationId, connectedAccountId, name, auto_init } = req.body;

  if (!connectedAccountId || !name) {
    throw new Error('Missing required fields');
  }

  const actionId = 'GITHUB_CREATE_A_REPOSITORY_FOR_THE_AUTHENTICATED_USER';

  const response = await axios.post(
    `https://backend.composio.dev/api/v2/actions/${actionId}/execute`,
    {
      integrationId,
      connectedAccountId,
      input: {
        name,
        private: false,
        auto_init,
      },
    },
    {
      headers: { 'x-api-key': config.composio.apiKey },
    },
  );

  return response.data;
};

const getAPullRequestsService = async req => {
  const { integrationId, connectedAccountId, owner, repo, pull_number } =
    req.body;

  if (!connectedAccountId || !owner || !repo) {
    throw new ApiError(
      400,
      'Missing required fields: connectedAccountId, owner, repo',
    );
  }
  // const actionId = 'GITHUB_PULLS_GET';
  const actionId = 'GITHUB_LIST_PULL_REQUESTS';
  const response = await axios.post(
    `https://backend.composio.dev/api/v2/actions/${actionId}/execute`,
    {
      integrationId: integrationId,
      connectedAccountId,
      input: { owner, repo, pull_number },
    },
    {
      headers,
    },
  );
  console.log(response, 'Response from GitHub API:');
  return response.data;
};
const listGitHubBranchesService = async req => {
  const { connectedAccountId, owner, repo } = req.body;

  if (!connectedAccountId || !owner || !repo) {
    throw new ApiError(
      400,
      'Missing required fields: connectedAccountId, owner, repo',
    );
  }

  const response = await axios.post(
    `https://backend.composio.dev/api/v2/actions/GITHUB_REPO_S_LIST_BRANCHES/execute`,
    {
      integrationId: githubIntegrationId,
      connectedAccountId,
      input: { owner, repo },
    },
    {
      headers,
    },
  );
  console.log(response, 'Response from GitHub API:');

  return response.data;
};

const createGithubIssueService = async req => {
  const { connectedAccountId, owner, repo, title, body } = req.body;

  if (!connectedAccountId || !owner || !repo || !title) {
    return { error: 'Missing required fields' };
  }

  const actionId = 'GITHUB_CREATE_ISSUE';
  const url = `https://backend.composio.dev/api/v2/actions/${actionId}/execute`;

  const response = await axios.post(
    url,
    {
      integrationId: githubIntegrationId,
      connectedAccountId,
      input: {
        owner,
        repo,
        title,
        body,
      },
    },
    {
      headers,
    },
  );

  return response.data;
};

const listGitHubReposService = async req => {
  const { connectedAccountId } = req.body;

  if (!connectedAccountId) {
    throw new ApiError(400, 'Missing required field: connectedAccountId');
  }

  // const actionId = 'GITHUB_LIST_REPOSITORIES_FOR_A_USER';
  const actionId = 'GITHUB_LIST_REPOSITORIES_FOR_THE_AUTHENTICATED_USER';
  const url = `https://backend.composio.dev/api/v2/actions/${actionId}/execute`;

  const response = await axios.post(
    url,
    {
      integrationId: githubIntegrationId,
      connectedAccountId,
      input: {}, // GitHub repo list may not require input, or pass `{ visibility: 'all' }`, etc.
    },
    {
      headers,
    },
  );

  return response.data;
};

const listOfOthersGitHubReposService = async req => {
  const { connectedAccountId, username } = req.body;

  if (!connectedAccountId || !username) {
    throw new ApiError(
      400,
      'Missing required fields: connectedAccountId and username',
    );
  }

  const actionId = 'GITHUB_LIST_REPOSITORIES_FOR_A_USER';
  const url = `https://backend.composio.dev/api/v2/actions/${actionId}/execute`;

  const response = await axios.post(
    url,
    {
      integrationId: githubIntegrationId,
      connectedAccountId,
      input: {
        username, // 👈 required input
      },
    },
    {
      headers,
    },
  );

  return response.data;
};
const followGitHubUserService = async req => {
  const { connectedAccountId, username } = req.body;

  if (!connectedAccountId || !username) {
    throw new ApiError(
      400,
      'Missing required fields: connectedAccountId and username',
    );
  }

  const actionId = 'GITHUB_FOLLOW_A_USER';
  const url = `https://backend.composio.dev/api/v2/actions/${actionId}/execute`;

  const response = await axios.post(
    url,
    {
      integrationId: githubIntegrationId,
      connectedAccountId,
      input: {
        username,
      },
    },
    {
      headers,
    },
  );

  return response.data;
};
const unfollowGitHubUserService = async req => {
  const { connectedAccountId, username } = req.body;

  if (!connectedAccountId || !username) {
    throw new ApiError(
      400,
      'Missing required fields: connectedAccountId and username',
    );
  }

  const actionId = 'GITHUB_UNFOLLOW_A_USER';
  const url = `https://backend.composio.dev/api/v2/actions/${actionId}/execute`;

  const response = await axios.post(
    url,
    {
      integrationId: githubIntegrationId,
      connectedAccountId,
      input: {
        username,
      },
    },
    {
      headers,
    },
  );

  return response.data;
};
const listFollowingGitHubUsersService = async req => {
  const { connectedAccountId } = req.body;

  if (!connectedAccountId) {
    throw new ApiError(400, 'Missing required field: connectedAccountId');
  }

  const actionId = 'GITHUB_LIST_THE_PEOPLE_THE_AUTHENTICATED_USER_FOLLOWS';
  const url = `https://backend.composio.dev/api/v2/actions/${actionId}/execute`;

  const response = await axios.post(
    url,
    {
      integrationId: githubIntegrationId,
      connectedAccountId,
      input: {},
    },
    {
      headers,
    },
  );

  return response.data;
};
const listGitHubFollowersService = async req => {
  const { connectedAccountId } = req.body;

  if (!connectedAccountId) {
    throw new ApiError(400, 'Missing required field: connectedAccountId');
  }

  const actionId = 'GITHUB_LIST_FOLLOWERS_OF_THE_AUTHENTICATED_USER';
  const url = `https://backend.composio.dev/api/v2/actions/${actionId}/execute`;

  const response = await axios.post(
    url,
    {
      integrationId: githubIntegrationId,
      connectedAccountId,
      input: {},
    },
    {
      headers,
    },
  );

  return response.data;
};

// =============================
//      Amazon Services
// =============================
const initiateAmazonConnectionService = async () => {
  // 1. Get all integrations
  const allIntegrationsResponse = await toolset.integrations.list();
  const integrations = allIntegrationsResponse.items || [];

  // 2. Find Amazon integration
  const amazonIntegration = integrations.find(integration =>
    integration.name.toLowerCase().includes('amazon'),
  );

  if (!amazonIntegration) {
    throw new Error('Amazon integration not found');
  }

  // 3. Initiate OAuth connection
  const connectionRequest = await toolset.connectedAccounts.initiate({
    integrationId: amazonIntegration.id,
    entityId: 'default', // Change as needed, "default" works for testing
  });

  return {
    redirectUrl: connectionRequest.redirectUrl,
    connectedAccountId: connectionRequest.connectedAccountId,
    connectionStatus: connectionRequest.connectionStatus,
  };
};

const searchAmazonProductService = async req => {
  const { connectedAccountId, query } = req.body;

  if (!connectedAccountId || !query) {
    return { error: 'Missing required fields: connectedAccountId, query' };
  }

  const actionId = 'AMAZON_SEARCH_PRODUCT';
  const url = `https://backend.composio.dev/api/v2/actions/${actionId}/execute`;

  const response = await axios.post(
    url,
    {
      integrationId: amazonIntegrationId, // Replace with your ID
      connectedAccountId,
      input: { query },
    },
    {
      headers,
    },
  );

  return response.data;
};
// =============================
//      Slack  services
// =============================

const getSlackIntegrationService = async () => {
  const integration = await toolset.integrations.get({
    integrationId: slackIntegrationId,
  });

  const inputFields = await toolset.integrations.getRequiredParams({
    integrationId: integration.id,
  });

  return { integration, inputFields };
};

const initiateSlackConnectionService = async integrationId => {
  const connectedAccount = await toolset.connectedAccounts.initiate({
    integrationId: integrationId,
    entityId: 'default', // Ideally use a real user ID here
  });
  return {
    redirectUrl: connectedAccount.redirectUrl,
    connectedAccountId: connectedAccount.connectedAccountId,
    connectionStatus: connectedAccount.connectionStatus,
  };
};
const sendMessageToChannelService = async req => {
  const { integrationId, connectedAccountId, channel, text } = req.body;
  if (!integrationId || !connectedAccountId || !channel || !text) {
    throw new ApiError(400, 'Missing required fields');
  }

  const actionId = 'SLACK_SENDS_A_MESSAGE_TO_A_SLACK_CHANNEL';
  const response = await axios.post(
    `https://backend.composio.dev/api/v2/actions/${actionId}/execute`,
    { integrationId, connectedAccountId, input: { channel, text } },
    { headers },
  );
  return response.data;
};

const sendMessageToUserService = async req => {
  const { integrationId, connectedAccountId, user, text } = req.body;
  if (!integrationId || !connectedAccountId || !user || !text) {
    throw new ApiError(400, 'Missing required fields');
  }

  const actionId = 'SLACK_SEND_MESSAGE_TO_USER';
  const response = await axios.post(
    `https://backend.composio.dev/api/v2/actions/${actionId}/execute`,
    { integrationId, connectedAccountId, input: { user, text } },
    { headers },
  );
  return response.data;
};

const listSlackChannelsService = async req => {
  const { integrationId, connectedAccountId } = req.body;
  if (!integrationId || !connectedAccountId) {
    throw new ApiError(400, 'Missing required fields');
  }

  const actionId = 'SLACK_LIST_CHANNELS';
  const response = await axios.post(
    `https://backend.composio.dev/api/v2/actions/${actionId}/execute`,
    { integrationId, connectedAccountId, input: {} },
    { headers },
  );
  return response.data;
};

const createSlackChannelService = async req => {
  const { integrationId, connectedAccountId, name, is_private } = req.body;
  if (!integrationId || !connectedAccountId || !name) {
    throw new ApiError(400, 'Missing required fields');
  }

  const actionId = 'SLACK_CREATE_CHANNEL';
  const response = await axios.post(
    `https://backend.composio.dev/api/v2/actions/${actionId}/execute`,
    {
      integrationId,
      connectedAccountId,
      input: { name, is_private: is_private ?? false },
    },
    { headers },
  );
  return response.data;
};

// =============================
//     Googlemeet Services
// =============================

const getGooglemeetIntegrationService = async () => {
  const integration = await toolset.integrations.get({
    integrationId: googlemeetIntegrationId,
  });

  const inputFields = await toolset.integrations.getRequiredParams({
    integrationId: integration.id,
  });

  return { integration, inputFields };
};

const initiateGooglemeetConnectionService = async integrationId => {
  const connectedAccount = await toolset.connectedAccounts.initiate({
    integrationId: integrationId,
    entityId: 'default', // Ideally use a real user ID here
  });
  return {
    redirectUrl: connectedAccount.redirectUrl,
    connectedAccountId: connectedAccount.connectedAccountId,
    connectionStatus: connectedAccount.connectionStatus,
  };
};
const createGoogleMeetService = async req => {
  const {
    integrationId,
    connectedAccountId,
    title,
    startTime,
    endTime,
    accessType = 'OPEN',
    entryPointAccess = 'ALL',
  } = req.body;

  if (
    !integrationId ||
    !connectedAccountId ||
    !title ||
    !startTime ||
    !endTime
  ) {
    throw new ApiError(400, 'Missing required fields');
  }

  const actionId = 'GOOGLEMEET_CREATE_MEET';

  try {
    const response = await axios.post(
      `https://backend.composio.dev/api/v2/actions/${actionId}/execute`,
      {
        connectedAccountId,
        input: {
          title,
          start_time: startTime,
          end_time: endTime,
          access_type: accessType || 'OPEN',
          entry_point_access: entryPointAccess || 'ALL',
        },
      },
      {
        headers,
      },
    );
    console.log(response, 'Response from Google Meet API:');
    return response.data;
  } catch (error) {
    console.log(error);
    throw new ApiError(500, 'Failed to create Google Meet');
  }
};
const getGoogleMeetDetailsService = async (req) => {
  const { integrationId, connectedAccountId,  space_name  } = req.body;
  if (!integrationId || !connectedAccountId || ! space_name ) {
    throw new ApiError(400, 'Missing required fields');
  }

  const actionId = 'GOOGLEMEET_GET_MEET';
  const response = await axios.post(
    `https://backend.composio.dev/api/v2/actions/${actionId}/execute`,
    {
      integrationId,
      connectedAccountId,
     input: { space_name },
    },
    { headers }
  );
  return response.data;
};
export const composioService = {
  getGmailIntegrationService,
  initiateGmailConnectionService,
  sendEmailService,
  getYouTubeIntegrationService,
  initiateYouTubeConnectionService,
  searchYouTubeService,
  disconnectYouTubeAccountService,
  getLinkedInOAuthRedirectUrlService,
  exchangeCodeLinkedInService,
  postToLinkedInService,
  initiateGoogleCalendarConnectionService,
  createCalendarEventService,
  getCalendarEventsService,
  deleteCalendarEventService,
  updateCalendarEventService,
  getGithubIntegrationService,
  initiateGithubConnectionService,
  createGitHubRepoService,
  getAPullRequestsService,
  listGitHubBranchesService,
  createGithubIssueService,
  listGitHubReposService,
  followGitHubUserService,
  unfollowGitHubUserService,
  listFollowingGitHubUsersService,
  listGitHubFollowersService,
  listOfOthersGitHubReposService,
  initiateAmazonConnectionService,
  searchAmazonProductService,
  initiateTwitterConnectionService,
  postTweetService,
  deleteTweetService,
  followTwitterUserService,
  getTwitterUserByUsernameService,
  sendDMByUsernameService,
  getSlackIntegrationService,
  initiateSlackConnectionService,
  sendMessageToChannelService,
  sendMessageToUserService,
  listSlackChannelsService,
  createSlackChannelService,
  getGooglemeetIntegrationService,
  initiateGooglemeetConnectionService,
  createGoogleMeetService,
  getGoogleMeetDetailsService
};
