import httpStatus from 'http-status';
import otpGenerator from 'otp-generator';
import { catchAsync } from '../../../shared/catchAsync';
import { sendResponse } from '../../../shared/sendResponse';

const authToken = '454677ee9511b4b238d35e4dfcbd8fdb';
const accountSid = 'ACe353d3ca367b8f5e0762b6f168fd2b8b';

// const client = require('twilio')(accountSid, authToken);
import twilio from 'twilio';
const client = twilio(accountSid, authToken);

client.verify.v2
  .services('VAa627ca35a14cd1ae0e9b0710c3decd92')
  .verifications.create({ to: '+88001862812422', channel: 'sms' })
  .then(verification => console.log(verification.sid));

export const sendOTP = catchAsync(async (req, res) => {
  const phoneNumber = '01969452868';

  const otp = await otpGenerator.generate(6, {
    lowerCaseAlphabets: false,
    upperCaseAlphabets: false,
    specialChars: false,
  });

  sendResponse(res, {
    statusCode: httpStatus.CREATED,
    success: true,
    message: 'Add Task Successfully',
    data: result,
  });
});
