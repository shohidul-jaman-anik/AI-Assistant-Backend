import express from 'express';
import { ENUM_USER_ROLE } from '../../../shared/enum.js';
import auth from '../../middlewares/auth/auth.js';
import { AdminController } from './admin.controller.js';
const router = express.Router();

// Both admin and super_admin can access general admin routes
const ADMIN_ROLES = [ENUM_USER_ROLE.ADMIN, ENUM_USER_ROLE.SUPER_ADMIN];

router
  .route('/make-admin/:userId')
  .patch(
    auth(ENUM_USER_ROLE.SUPER_ADMIN),
    AdminController.makeUserAdminController
  );

router
  .route('/delete-user-admin/:userId')
  .delete(
    auth(ENUM_USER_ROLE.SUPER_ADMIN),
    AdminController.deleteAnyUserController
  );

router.put(
  '/update-user-role/:id',
  auth(ENUM_USER_ROLE.SUPER_ADMIN),
  AdminController.updateUserRole
);

router.delete(
  '/delete-user/:objectId',
  auth(...ADMIN_ROLES),
  AdminController.deleteUser
);

router.get(
  '/buyer/all-user',
  auth(...ADMIN_ROLES),
  AdminController.getAllBuyer
);

router.get('/all-user', auth(...ADMIN_ROLES), AdminController.getAllUsers);

router.get('/all-payment', auth(...ADMIN_ROLES), AdminController.getAllPayment);

router.get('/admin/:email', AdminController.getAdmin);

router.get(
  '/all-user/statistics',
  auth(...ADMIN_ROLES),
  AdminController.getUserStatisticsByMonth
);

// ============= Tenant Management Routes (Admin) =============

/**
 * @route   GET /api/v1/admin/tenants
 * @desc    Get all tenants with pagination
 * @access  Private (Admin only)
 */
router.get('/tenants', auth(...ADMIN_ROLES, ENUM_USER_ROLE.SUPER_ADMIN), AdminController.getAllTenants);

/**
 * @route   GET /api/v1/admin/tenants/:tenantId
 * @desc    Get tenant details
 * @access  Private (Admin only)
 */
router.get(
  '/tenants/:tenantId',
  auth(...ADMIN_ROLES, ENUM_USER_ROLE.SUPER_ADMIN),
  AdminController.getTenantDetails
);

/**
 * @route   PATCH /api/v1/admin/tenants/:tenantId/status
 * @desc    Update tenant status (active/suspended/cancelled)
 * @access  Private (Admin only)
 */
router.patch(
  '/tenants/:tenantId/status',
  auth(...ADMIN_ROLES),
  AdminController.updateTenantStatus
);

/**
 * @route   GET /api/v1/admin/tenants/:tenantId/usage
 * @desc    View tenant usage statistics
 * @access  Private (Admin only)
 */
router.get(
  '/tenants/:tenantId/usage',
  auth(...ADMIN_ROLES),
  AdminController.getTenantUsageAdmin
);

/**
 * @route   POST /api/v1/admin/tenants/:tenantId/extend-trial
 * @desc    Extend tenant trial period
 * @access  Private (Admin only)
 */
router.post(
  '/tenants/:tenantId/extend-trial',
  auth(...ADMIN_ROLES),
  AdminController.extendTenantTrial
);

router.patch(
  '/tenants/:tenantId/settings',
  auth(...ADMIN_ROLES),
  AdminController.updateTenantSettings
);

// ─── Users (5.4–5.8) ─────────────────────────────────────────────────────────

router.get(
  '/users/:userId',
  auth(...ADMIN_ROLES),
  AdminController.getUserDetail
);

router.patch(
  '/users/:userId',
  auth(...ADMIN_ROLES),
  AdminController.updateUser
);

router.post(
  '/users/:userId/reset-limit',
  auth(...ADMIN_ROLES),
  AdminController.resetUserLimit
);

router.get(
  '/users/:userId/usage',
  auth(...ADMIN_ROLES),
  AdminController.getUserUsage
);

router.get(
  '/users/:userId/usage-logs',
  auth(...ADMIN_ROLES),
  AdminController.getUserUsageLogs
);

// ─── Tenant Members (5.9–5.10) ───────────────────────────────────────────────

router.get(
  '/tenants/:tenantId/members',
  auth(...ADMIN_ROLES),
  AdminController.getTenantMembers
);

router.delete(
  '/tenants/:tenantId/members/:userId',
  auth(...ADMIN_ROLES),
  AdminController.removeTenantMember
);

// ─── Platform Usage (5.11–5.14) ──────────────────────────────────────────────

router.get(
  '/usage/summary',
  auth(...ADMIN_ROLES),
  AdminController.getPlatformUsageSummary
);

router.get(
  '/usage/by-module',
  auth(...ADMIN_ROLES),
  AdminController.getUsageByModule
);

router.get(
  '/usage/by-user',
  auth(...ADMIN_ROLES),
  AdminController.getTopUsersByUsage
);

router.get('/usage/logs', auth(...ADMIN_ROLES), AdminController.getUsageLogs);

router.get('/usage/daily', auth(...ADMIN_ROLES), AdminController.getDailyUsage);

export const adminRoutes = router;
