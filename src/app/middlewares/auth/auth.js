// import config from '../../../../config';

// const jwt = require('jsonwebtoken');
// // const config = require('../../../../config');

// const Auth = async (req, res, next) => {
//   try {
//     // access authorize header to validate request
//     const token = req.headers.authorization.split(' ')[1];

//     // retrive the user details fo the logged in user
//     const decodedToken = await jwt.verify(token, config.jwt.access_token);

//     req.user = decodedToken;

//     next();
//   } catch (error) {
//     res.status(401).json({ error: 'Authentication Failed!' });
//   }
// };
// function localVariables(req, res, next) {
//   req.app.locals = {
//     OTP: null,
//     resetSession: false,
//   };
//   next();
// }
// // module.exports = Auth;
// export default {
//   Auth,
//   localVariables,
// };

import httpStatus from 'http-status';
import config from '../../../../config/index.js';
import ApiError from '../../../errors/ApiError.js';
import { jwtHelpers } from '../../helpers/jwtHelpers.js';

// const auth = (...requiredRoles) => {
//   return async (req, res, next) => {
//     try {
//       // Get authorization token
//       const token = req.headers.authorization;
//       if (!token) {
//         throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
//       }

//       // Verify token
//       let verifiedUser = null;
//       verifiedUser = jwtHelpers.verifyToken(token, config.jwt.access_token);

//       req.user = verifiedUser; // role, userId

//       if (requiredRoles.length && !requiredRoles.includes(verifiedUser.role)) {
//         throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
//       }

//       next();
//     } catch (error) {
//       next(error);
//     }
//   };
// };

const auth = (...requiredRoles) => {
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        throw new ApiError(httpStatus.UNAUTHORIZED, 'You are not authorized');
      }

      const token = authHeader.split(' ')[1];

      const verifiedUser = jwtHelpers.verifyToken(token, config.jwt.access_token);

      req.user = verifiedUser;

      if (requiredRoles.length && !requiredRoles.includes(verifiedUser.role)) {
        throw new ApiError(httpStatus.FORBIDDEN, 'Forbidden');
      }

      next();
    } catch (error) {
      next(error);
    }
  };
};


export default auth;
