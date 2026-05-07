// const pick = require('../../middlewares/other/pick');
import httpStatus from 'http-status';
import catchAsync from '../../../shared/catchAsync.js';
import sendResponse from '../../../shared/sendResponse.js';
import pick from '../../middlewares/other/pick.js';
import { paginationFields } from './admin.constant.js';
import { AdminService } from './admin.service.js';

const getAllBuyer = catchAsync(async (req, res) => {
  const buyers = await AdminService.getAllBuyerServices();

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Get All Paid User',
    data: buyers,
  });
});



const deleteUser = catchAsync(async (req, res) => {
  const objectId = req.params?.objectId;
  const result = await AdminService.deleteUserService(objectId);


  if (!result.deletedCount) {
    return res.status(400).json({
      status: 'fail',
      error: "Could't delete the user",
    });
  }

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'User Delete Successfully',
    data: result,
  });
});

const getAllUsers = catchAsync(async (req, res) => {

  const filters = pick(req.query, [
    'searchTerm',
    'email',
    'firstName',
    'lastName',
  ]);

  const paginationOptions = pick(req.query, paginationFields);

  const users = await AdminService.getAllUsersService(
    filters,
    paginationOptions,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Users find Successfully',
    data: users,
  });
});

const updateUserRole = catchAsync(async (req, res) => {
  const { id } = req.params;
  const { role } = req.body;

  const result = await AdminService.updateUserRoleService(id, role);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Update Role successfully',
    data: result,
  });
});

const getAdmin = catchAsync(async (req, res) => {
  const { email } = req.params;
  const admin = await AdminService.getAdminServices(email);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Admin get Successfully',
    data: admin,
  });
});

const getUserStatisticsByMonth = catchAsync(async (req, res) => {
  const result = await AdminService.getUserStatisticsByMonthService();
  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Get User Statistics Successfully',
    data: result,
  });
});

const getAllPayment = catchAsync(async (req, res) => {
  const filters = pick(req.query, [
    'searchTerm',
    'price',
    'plan_name',
    'duration',
  ]);

  const paginationOptions = pick(req.query, paginationFields);

  const result = await AdminService.getAllPaymentService(
    filters,
    paginationOptions,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Get All Paid User',
    data: result,
  });
});

/**
 * Get all tenants
 */
const getAllTenants = catchAsync(async (req, res) => {
  const filters = pick(req.query, ['searchTerm', 'status', 'plan']);
  const paginationOptions = pick(req.query, paginationFields);

  const result = await AdminService.getAllTenantsService(filters, paginationOptions);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Tenants retrieved successfully',
    data: result,
  });
});

/**
 * Get tenant details
 */
const getTenantDetails = catchAsync(async (req, res) => {
  const { tenantId } = req.params;

  const result = await AdminService.getTenantDetailsService(tenantId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Tenant details retrieved successfully',
    data: result,
  });
});

/**
 * Update tenant status
 */
const updateTenantStatus = catchAsync(async (req, res) => {
  const { tenantId } = req.params;
  const { status } = req.body;

  const result = await AdminService.updateTenantStatusService(tenantId, status);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Tenant status updated successfully',
    data: result,
  });
});

/**
 * Get tenant usage
 */
const getTenantUsageAdmin = catchAsync(async (req, res) => {
  const { tenantId } = req.params;

  const result = await AdminService.getTenantUsageService(tenantId);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Tenant usage retrieved successfully',
    data: result,
  });
});

/**
 * Extend tenant trial
 */
const extendTenantTrial = catchAsync(async (req, res) => {
  const { tenantId } = req.params;
  const { days } = req.body;

  const result = await AdminService.extendTenantTrialService(tenantId, days);

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: 'Tenant trial extended successfully',
    data: result,
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5.4  User Detail
// ─────────────────────────────────────────────────────────────────────────────
const getUserDetail = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const result = await AdminService.getUserDetailService(userId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'User retrieved successfully', data: result });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5.5  Update User
// ─────────────────────────────────────────────────────────────────────────────
const updateUser = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const result = await AdminService.updateUserService(userId, req.body);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'User updated successfully', data: result });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5.6  Reset User Daily Limit
// ─────────────────────────────────────────────────────────────────────────────
const resetUserLimit = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const result = await AdminService.resetUserLimitService(userId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Daily limit reset successfully', data: result });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5.7  User Usage
// ─────────────────────────────────────────────────────────────────────────────
const getUserUsage = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const { period } = req.query;
  const result = await AdminService.getUserUsageService(userId, period);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'User usage retrieved successfully', data: result });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5.8  User Usage Logs
// ─────────────────────────────────────────────────────────────────────────────
const getUserUsageLogs = catchAsync(async (req, res) => {
  const { userId } = req.params;
  const filters = pick(req.query, ['module', 'status', 'startDate', 'endDate']);
  const paginationOptions = pick(req.query, paginationFields);
  const result = await AdminService.getUserUsageLogsService(userId, filters, paginationOptions);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'User usage logs retrieved successfully', data: result });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5.9  Tenant Members
// ─────────────────────────────────────────────────────────────────────────────
const getTenantMembers = catchAsync(async (req, res) => {
  const { tenantId } = req.params;
  const paginationOptions = pick(req.query, paginationFields);
  const result = await AdminService.getTenantMembersService(tenantId, paginationOptions);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Tenant members retrieved successfully', data: result });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5.10  Remove Tenant Member
// ─────────────────────────────────────────────────────────────────────────────
const removeTenantMember = catchAsync(async (req, res) => {
  const { tenantId, userId } = req.params;
  const result = await AdminService.removeTenantMemberService(tenantId, userId);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Member removed from tenant successfully', data: result });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5.11  Platform Usage Summary
// ─────────────────────────────────────────────────────────────────────────────
const getPlatformUsageSummary = catchAsync(async (req, res) => {
  const { period } = req.query;
  const result = await AdminService.getPlatformUsageSummaryService(period);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Platform usage summary retrieved', data: result });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5.12  Usage by Module
// ─────────────────────────────────────────────────────────────────────────────
const getUsageByModule = catchAsync(async (req, res) => {
  const { period } = req.query;
  const result = await AdminService.getUsageByModuleService(period);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Usage by module retrieved', data: result });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5.13  Top Users by Usage
// ─────────────────────────────────────────────────────────────────────────────
const getTopUsersByUsage = catchAsync(async (req, res) => {
  const { limit, period } = req.query;
  const result = await AdminService.getTopUsersByUsageService(limit, period);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Top users by usage retrieved', data: result });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5.14  Usage Log Browser
// ─────────────────────────────────────────────────────────────────────────────
const getUsageLogs = catchAsync(async (req, res) => {
  const filters = pick(req.query, ['userId', 'tenantId', 'module', 'status', 'startDate', 'endDate']);
  const paginationOptions = pick(req.query, paginationFields);
  const result = await AdminService.getUsageLogsService(filters, paginationOptions);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Usage logs retrieved successfully', data: result });
});

// ─────────────────────────────────────────────────────────────────────────────
// 5.15  Daily Usage Breakdown
// ─────────────────────────────────────────────────────────────────────────────
const getDailyUsage = catchAsync(async (req, res) => {
  const { period } = req.query;
  const result = await AdminService.getDailyUsageService(period);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Daily usage retrieved', data: result });
});

const updateTenantSettings = catchAsync(async (req, res) => {
  const { tenantId } = req.params;
  const { settings } = req.body;
  const result = await AdminService.updateTenantSettingsService(tenantId, settings);
  sendResponse(res, { statusCode: httpStatus.OK, success: true, message: 'Tenant settings updated', data: result });
});


// ===========

const makeUserAdminController = catchAsync(async (req, res) => {

  console.log(req.params.userId, 'userId from params in controller');
  console.log(req.body.role, 'role from body in controller');
  const result = await AdminService.makeUserAdminService(
    req.user,
    req.params?.userId,
    req.body?.role,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result.data,
  });
});

const deleteAnyUserController = catchAsync(async (req, res) => {
  const result = await AdminService.deleteAnyUserService(
    req.user,
    req.params.userId,
  );

  sendResponse(res, {
    statusCode: httpStatus.OK,
    success: true,
    message: result.message,
    data: result,
  });
});


export const AdminController = {
  getAllBuyer,
  deleteUser,
  getAllUsers,
  updateUserRole,
  getAdmin,
  getUserStatisticsByMonth,
  getAllPayment,
  getAllTenants,
  getTenantDetails,
  updateTenantStatus,
  updateTenantSettings,
  getTenantUsageAdmin,
  extendTenantTrial,
  // New — 5.4–5.14
  getUserDetail,
  updateUser,
  resetUserLimit,
  getUserUsage,
  getUserUsageLogs,
  getTenantMembers,
  removeTenantMember,
  getPlatformUsageSummary,
  getUsageByModule,
  getTopUsersByUsage,
  getUsageLogs,
  getDailyUsage,
  makeUserAdminController,
  deleteAnyUserController
};
