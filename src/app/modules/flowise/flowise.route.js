// import express from 'express';
// import { createProxyMiddleware } from 'http-proxy-middleware'; // ✅ CORRECTED
// const router = express.Router();

// // Middleware to protect access
// const ensureAuthenticated = (req, res, next) => {
//   // check if user is logged in
//   // if (!req.session.user) return res.status(401).send('Unauthorized')
//   next();
// };

// // Proxy requests to Flowise
// router.use(
//   '/flow/flowise',
//   ensureAuthenticated,
//   createProxyMiddleware({
//     target: 'http://localhost:3100',
//     changeOrigin: true,
//     pathRewrite: {
//       '^/flow/flowise': '/', // so /flowise flows into /
//     },
//   }),
// );

// export const flowiseRoutes = router;

// flowiseRoutes.js
import express from 'express';
import { createProxyMiddleware } from 'http-proxy-middleware';

const router = express.Router();

const ensureAuthenticated = (req, res, next) => {
  next();
};

router.use(
  '/',
  ensureAuthenticated,
  createProxyMiddleware({
    target: 'http://localhost:3100',
    changeOrigin: true,
  }),
);

export default router;
