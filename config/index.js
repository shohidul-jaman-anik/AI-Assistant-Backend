const dotenv = require('dotenv');
const path = require('path');

dotenv.config({ path: path.join(process.cwd(), '.env') });

module.exports = {
  env: process.env.NODE_ENV,
  database_local: process.env.DATABASE_LOCAL,
  port: process.env.PORT,
  jwt_secret: process.env.JWT_SECRET,
  email: process.env.email,
  password: process.env.password,
  client_id: process.env.CLIENT_ID,
  client_secret: process.env.CLIENT_SECRET,
  sender_mail: process.env.SENDER_MAIL,
  refresh_token: process.env.REFRESH_TOKEN,
  access_token: process.env.ACCESS_TOKEN,
  confirm_reg_email: process.env.CONFIRM_REG_EMAIL,
  livekit_api_key: process.env.LIVEKIT_API_KEY,
  livekit_secret_key: process.env.LIVEKIT_SECRET_KEY
  // stripe_secret_key: process.env.STRIPE_SECRET_KEY
};
