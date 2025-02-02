import formData from 'form-data';
import Mailgun from 'mailgun.js';
import config from '../../../../config/index.js';

const mailgun = new Mailgun(formData);


const mg = mailgun.client({
  username: 'api',
  key: `${config.mailgun?.mailgun_key}`,
});

export const  sendMailWithMailGun = async mailData => {
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
