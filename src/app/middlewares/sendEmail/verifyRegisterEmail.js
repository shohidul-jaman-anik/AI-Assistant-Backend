// WITH GMAIL
const nodemailer = require('nodemailer');
const { google } = require('googleapis');
const config = require('../../../../config');

const oAuth2Client = new google.auth.OAuth2(
  config.client_id,
  config.client_secret,
  'https://developers.google.com/oauthplayground',
);
oAuth2Client.setCredentials({ refresh_token: config.refresh_token });

module.exports.sendMailForRegisterWithGmail = async data => {
  const accessToken = await oAuth2Client.getAccessToken();

  let transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
      type: 'OAuth2',
      user: config.sender_mail,
      clientId: config.client_id,
      clientSecret: config.client_secret,
      refreshToken: config.refresh_token,
      accessToken: accessToken,
    },
  });

  const mailData = {
    from: config.sender_mail, // sender address
    to: data.to, // list of receivers
    subject: data.subject,
    html: data.text,
  };

  let info = await transporter.sendMail(mailData);

  console.log('Message sent: %s', info.messageId);

  console.log('Preview URL: %s', nodemailer.getTestMessageUrl(info));

  return info.messageId;
};
