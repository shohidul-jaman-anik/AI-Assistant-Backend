const formData = require('form-data');
const Mailgun = require('mailgun.js');
const config = require('../../../../config');
const mailgun = new Mailgun(formData);
const mg = mailgun.client({
  username: 'api',
  key: `${config.mailgun?.mailgun_key}`,
});

module.exports.sendMailWithMailGun = async mailData => {
  const { sub, message, userEmail } = mailData;

  return new Promise((resolve, reject) => {
    mg.messages
      .create(config.mailgun?.mailgun_domain, {
        from: config.mailgun?.mailgun_from,
        to: userEmail,
        subject: sub,
        html: message,
      })
      .then(msg => {
        console.log(msg); // logs response data
        resolve(msg);
      })
      .catch(err => {
        console.error(err); // logs any error
        reject(err);
      });
  });
};
