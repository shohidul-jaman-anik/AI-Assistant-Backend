const crypto = require('crypto');

module.exports.generateSessionId = () => {
  return crypto.randomBytes(24).toString('hex');
};
