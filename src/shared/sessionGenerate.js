module.exports.generateSessionIdForLlama = () => {
  return crypto.randomBytes(24).toString('hex');
};
