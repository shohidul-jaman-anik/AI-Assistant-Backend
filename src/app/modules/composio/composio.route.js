import express from 'express';
import { composioController } from './composio.controller.js';

const router = express.Router();

// Gmail routes
router.get('/gmail/integration', composioController.getGmailIntegration);
router.post('/gmail/connect', composioController.initiateGmailConnection);
router.post('/gmail/send-email', composioController.sendEmail);

// YouTube routes
router.get('/youtube/integration', composioController.getYouTubeIntegration);
router.post('/youtube/connect', composioController.initiateYouTubeConnection);
router.post('/youtube/search', composioController.searchYouTube);
router.delete(
  '/youtube/disconnect/:id',
  composioController.disconnectYouTubeAccount,
);

// LinkedIn routes
router.get('/linkedin/auth/start', composioController.startLinkedInOAuth);
router.get(
  '/linkedin/auth/callback',
  composioController.handleLinkedInCallback,
);
router.post('/linkedin/post', composioController.postToLinkedIn);

// Google Calendar routes
router.post(
  '/calendar/connect',
  composioController.initiateGoogleCalendarConnection,
);
router.post('/calendar/create-event', composioController.createCalendarEvent);
router.post('/calendar/events', composioController.getCalendarEvents);
router.delete('/calendar/delete-event', composioController.deleteCalendarEvent);
router.patch('/calendar/update-event', composioController.updateCalendarEvent);

// GitHub routes
router.get('/github/integration', composioController.getGithubIntegration);
router.post('/github/connect', composioController.initiateGithubConnection);
router.post('/github/create-repo', composioController.createGitHubRepo);
router.post('/github/pull-requests', composioController.listGitHubPullRequests);
router.post('/github/branches', composioController.listGitHubBranches);
router.post('/github/create-issue', composioController.createGithubIssue);
router.post('/github/follow-user', composioController.followGitHubUser);
router.post('/github/unfollow', composioController.unfollowGitHubUser);
router.post('/github/following', composioController.listFollowingGitHubUsers);
router.post('/github/followers', composioController.listGitHubFollowers);
router.post('/github/myself-repos', composioController.listGitHubRepos);
router.post('/github/another-repos', composioController.listOfOtherGitHubRepos);

// Amazon Routes
router.post('/amazon/connect', composioController.initiateAmazonConnection);
router.post('/amazon/search', composioController.searchAmazonProduct);

// Twitter Routes
router.post('/twitter/connect', composioController.initiateTwitterConnection);
router.post('/twitter/post', composioController.postTweet);
router.post('/twitter/follow-user', composioController.followTwitterUser);
router.post('/twitter/delete-tweet', composioController.deleteTweet);
router.post(
  '/twitter/user-lookup',
  composioController.getTwitterUserByUsername,
);
router.post('/twitter/send-message', composioController.sendDMByUsername);

// Slack Routes
router.get('/slack/integration', composioController.getSlackIntegration);
router.post('/slack/connect', composioController.initiateSlackConnection);
router.post('/slack/send-channel-message', composioController.sendMessageToChannel);
router.post('/slack/send-user-message', composioController.sendMessageToUser);
router.post('/slack/list-channels', composioController.listSlackChannels);
router.post('/slack/create-channel', composioController.createSlackChannel);

// Googlemeet Routes
router.get('/googlemeet/integration', composioController.getGooglemeetIntegration);
router.post('/googlemeet/connect', composioController.initiateGooglemeetConnection);
router.post('/googlemeet/create-meeting', composioController.createMeetController);
router.post('/googlemeet/meet-details', composioController.getGoogleMeetDetails);


export const composioRoutes = router;
