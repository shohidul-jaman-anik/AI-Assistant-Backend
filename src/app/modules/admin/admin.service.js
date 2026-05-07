import mongoose from 'mongoose';
import { logger } from '../../../shared/logger.js';
import paginationHelpers from '../../helpers/paginationHelpers.js';
import UserModel from '../auth/auth.model.js';
import SubscriptionModel from '../payment/payment.model.js';
import TenantMember from '../tenant/tenantMember.model.js';
import ApiError from '../../../errors/ApiError.js';
import httpStatus from 'http-status';
import Token from '../auth/token.model.js';

// ===========================================
//                  All Users
//============================================

const getAllUsersService = async (filters, paginationOptions) => {
  const { searchTerm } = filters;

  const productsSearchAbleFields = ['email', 'name'];
  const andConditions = [];

  // Add a default condition if andConditions is empty
  if (andConditions.length === 0) {
    andConditions.push({});
  }

  if (searchTerm) {
    andConditions.push({
      $or: productsSearchAbleFields.map((field) => ({
        [field]: { $regex: searchTerm, $options: 'i' },
      })),
    });
  }

  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelpers.calculatePagination(paginationOptions);

  const sortConditions = {};
  if (sortBy && sortOrder) {
    sortConditions[sortBy] = sortOrder;
  }

  const users = await UserModel.find({ $and: andConditions })
    .select(
      'name email role isSubscribed subscription tenantId dailyRequestLimit freePlanUsage provider createdAt avatar'
    )
    .sort(sortConditions)
    .skip(skip)
    .limit(limit);

  const total = await UserModel.estimatedDocumentCount();
  const paidUser = await UserModel.countDocuments({
    'subscription.status': 'paid',
  });
  const freeUser = await UserModel.countDocuments({ plan: 'free' });
  const unverifyUsers = await UserModel.countDocuments({
    role: 'unauthorized',
  });

  return {
    meta: {
      page,
      limit,
      total,
      paidUser,
      freeUser,
      unverifyUsers,
    },
    data: users,
  };
};

// const updateUserRoleService = async (id, userRole) => {
//   const filter = { _id: id };
//   const updateDoc = {
//     $set: { role: userRole },
//   };
//   const result = await UserModel.updateOne(filter, updateDoc, {
//     runValidators: true,
//   });
//   return result;
// };

//===================  Buyer =========================
const getAllBuyerServices = async () => {
  const result = await UserModel.find({ role: 'buyer' });
  return result;
};

//====================  Admin ========================

const getSellerServiceById = async (id) => {
  const result = await UserModel.findOne({ _id: id });
  logger.info(result);
  return result;
};

const ALLOWED_ROLES = ['user', 'admin', 'super_admin'];

const updateUserRoleService = async (userId, role) => {
  if (!ALLOWED_ROLES.includes(role)) {
    throw new Error(
      `Invalid role. Must be one of: ${ALLOWED_ROLES.join(', ')}`
    );
  }
  const filter = { _id: userId };
  const updateDoc = { $set: { role } };
  const result = await UserModel.findOneAndUpdate(filter, updateDoc, {
    new: true,
    runValidators: true,
    select: 'name email role',
  });
  if (!result) throw new Error('User not found');
  return result;
};

// kept for backward compat (used by old getAllBuyer flow)
const makeAdminService = async (userId) =>
  updateUserRoleService(userId, 'admin');

const deleteUserService = async (objectId) => {
  if (!mongoose.Types.ObjectId.isValid(objectId)) {
    throw new Error('Invalid user ID format');
  }

  const mongoId = new mongoose.Types.ObjectId(objectId); // <-- convert explicitly

  const user = await UserModel.findOne({ _id: mongoId });
  logger.info('User found:', user);

  if (!user) {
    throw new Error('User not found');
  }

  if (user.role === 'admin') {
    throw new Error('Cannot delete an admin user');
  }

  const result = await UserModel.deleteOne({ _id: mongoId });
  return result;
};

//==================== Sup Admin ========================

const getAdminServices = async (email) => {
  // const admin = await UserModel.find({ email: email })
  // const isAdmin = admin.role === "admin"
  // return isAdmin;
  const admin = await UserModel.findOne({ email: email });
  if (admin && admin.role === 'admin') {
    return true;
  } else {
    return false;
  }
};

const getUserStatisticsByMonthService = async () => {
  const aggregationResult = await UserModel.aggregate([
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1 },
    },
  ]);

  const result = aggregationResult.reduce((acc, item) => {
    const year = item._id.year;
    const month = item._id.month;
    const count = item.count;
    const monthName = new Date(year, month - 1).toLocaleString('default', {
      month: 'long',
    });

    if (!acc[year]) {
      acc[year] = {
        year,
        totalMonth: 0,
        months: {},
      };
    }

    acc[year].months[monthName] = count;
    acc[year].totalMonth += 1;

    return acc;
  }, {});

  const data = Object.values(result).map((item) => ({
    count: Object.values(item.months).reduce((sum, count) => sum + count, 0),
    year: item.year,
    totalMonth: item.totalMonth,
    month: item.months,
  }));

  return {
    statusCode: 200,
    success: true,
    message: 'Get User Statistics Successfully',
    data: data,
  };
};

const getAllPaymentService = async (filters, paginationOptions) => {
  const { searchTerm } = filters;

  const productsSearchAbleFields = [
    'price',
    'plan_name',
    'duration',
    'expiresAt',
  ];
  const andConditions = [];

  // Add a default condition if andConditions is empty
  if (andConditions.length === 0) {
    andConditions.push({});
  }

  if (searchTerm) {
    andConditions.push({
      $or: productsSearchAbleFields.map((field) => ({
        [field]: { $regex: searchTerm, $options: 'i' },
      })),
    });
  }

  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelpers.calculatePagination(paginationOptions);

  const sortConditions = {};
  if (sortBy && sortOrder) {
    sortConditions[sortBy] = sortOrder;
  }

  const users = await SubscriptionModel.find({ $and: andConditions })
    .select('transactionId price plan_name duration expiresAt')
    .sort(sortConditions)
    .skip(skip)
    .limit(limit);

  const total = await SubscriptionModel.estimatedDocumentCount();
  const paidUser = await SubscriptionModel.countDocuments({
    paymentStatus: 'paid',
  });
  const freeUser = await SubscriptionModel.countDocuments({ plan: 'free' });
  const professionalPlan = await SubscriptionModel.countDocuments({
    plan_name: 'professional',
  });
  const personalPlan = await SubscriptionModel.countDocuments({
    plan_name: 'personal',
  });
  const businessPlan = await SubscriptionModel.countDocuments({
    plan_name: 'business',
  });

  return {
    meta: {
      page,
      limit,
      total,
      paidUser,
      freeUser,
      professionalPlan,
      personalPlan,
      businessPlan,
    },
    data: users,
  };
};

/**
 * Get all tenants (admin)
 */
const getAllTenantsService = async (filters, paginationOptions) => {
  const Tenant = (await import('../tenant/tenant.model.js')).default;
  const { searchTerm, ...filterData } = filters;
  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelpers.calculatePagination(paginationOptions);

  const andConditions = [];

  if (searchTerm) {
    andConditions.push({
      $or: ['name', 'slug'].map((field) => ({
        [field]: { $regex: searchTerm, $options: 'i' },
      })),
    });
  }

  if (Object.keys(filterData).length) {
    andConditions.push({
      $and: Object.entries(filterData).map(([field, value]) => ({
        [field]: value,
      })),
    });
  }

  const query = andConditions.length > 0 ? { $and: andConditions } : {};
  const sortConditions = {};
  if (sortBy && sortOrder) {
    sortConditions[sortBy] = sortOrder;
  }

  const tenants = await Tenant.find(query)
    .populate('ownerId', 'name email')
    .sort(sortConditions)
    .skip(skip)
    .limit(limit);

  const total = await Tenant.countDocuments(query);

  return {
    meta: { page, limit, total },
    data: tenants,
  };
};

/**
 * Get tenant details (admin)
 */
const getTenantDetailsService = async (tenantId) => {
  const Tenant = (await import('../tenant/tenant.model.js')).default;
  const UserModel = (await import('../auth/auth.model.js')).default;

  const tenant = await Tenant.findById(tenantId).populate(
    'ownerId',
    'name email'
  );

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  // Get member count
  const memberCount = await UserModel.countDocuments({ tenantId });

  return {
    ...tenant.toObject(),
    memberCount,
  };
};

/**
 * Update tenant status (admin)
 */
const updateTenantStatusService = async (tenantId, status) => {
  const Tenant = (await import('../tenant/tenant.model.js')).default;

  const tenant = await Tenant.findByIdAndUpdate(
    tenantId,
    { status },
    { new: true, runValidators: true }
  );

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  return tenant;
};

/**
 * Get tenant usage (admin)
 */
const getTenantUsageService = async (tenantId) => {
  const tenantService = (await import('../tenant/tenant.service.js'))
    .tenantService;
  return await tenantService.getTenantUsage(tenantId);
};

/**
 * Extend tenant trial (admin)
 */
const extendTenantTrialService = async (tenantId, days) => {
  const Tenant = (await import('../tenant/tenant.model.js')).default;

  const tenant = await Tenant.findById(tenantId);

  if (!tenant) {
    throw new Error('Tenant not found');
  }

  const currentTrialEnd = tenant.trialEndsAt || new Date();
  const newTrialEnd = new Date(currentTrialEnd);
  newTrialEnd.setDate(newTrialEnd.getDate() + parseInt(days));

  tenant.trialEndsAt = newTrialEnd;
  await tenant.save();

  return tenant;
};

// ─────────────────────────────────────────────────────────────────────────────
// 5.4  User Detail
// ─────────────────────────────────────────────────────────────────────────────
const getUserDetailService = async (userId) => {
  const user = await UserModel.findById(userId)
    .select(
      'name email role isSubscribed subscription tenantId dailyRequestLimit freePlanUsage provider createdAt avatar'
    )
    .populate('tenantId', 'name slug');
  if (!user) throw new Error('User not found');
  return user;
};

// ─────────────────────────────────────────────────────────────────────────────
// 5.5  Update User
// ─────────────────────────────────────────────────────────────────────────────
const updateUserService = async (userId, updates) => {
  const allowed = ['role', 'isSubscribed', 'dailyRequestLimit'];
  const sanitized = {};
  for (const key of allowed) {
    if (updates[key] !== undefined) sanitized[key] = updates[key];
  }
  const user = await UserModel.findByIdAndUpdate(
    userId,
    { $set: sanitized },
    {
      new: true,
      runValidators: true,
      select: 'name email role isSubscribed dailyRequestLimit',
    }
  );
  if (!user) throw new Error('User not found');
  return user;
};

// ─────────────────────────────────────────────────────────────────────────────
// 5.6  Reset User Daily Limit
// ─────────────────────────────────────────────────────────────────────────────
const resetUserLimitService = async (userId) => {
  const user = await UserModel.findByIdAndUpdate(
    userId,
    {
      $set: {
        'dailyRequestLimit.requestsUsed': 0,
        'dailyRequestLimit.lastResetAt': new Date(),
      },
    },
    { new: true, select: 'name email dailyRequestLimit' }
  );
  if (!user) throw new Error('User not found');
  return user;
};

// ─────────────────────────────────────────────────────────────────────────────
// 5.7  User Usage
// ─────────────────────────────────────────────────────────────────────────────
const getUserUsageService = async (userId, period = '7d') => {
  const UserUsageModel = (await import('../usage/userUsage.model.js')).default;
  const now = new Date();
  const startDate = new Date();
  if (period === 'today') {
    startDate.setUTCHours(0, 0, 0, 0);
  } else if (period === '30d') {
    startDate.setDate(now.getDate() - 30);
  } else {
    startDate.setDate(now.getDate() - 7);
  }

  const records = await UserUsageModel.find({
    userId: new mongoose.Types.ObjectId(userId),
    date: { $gte: startDate, $lte: now },
  }).sort({ date: 1 });

  const totalRequests = records.reduce((s, r) => s + r.requestsUsed, 0);
  const storageUsed = records.length
    ? records[records.length - 1].storageUsed
    : 0;

  return { totalRequests, storageUsed, breakdown: records };
};

// ─────────────────────────────────────────────────────────────────────────────
// 5.8  User Usage Logs
// ─────────────────────────────────────────────────────────────────────────────
const getUserUsageLogsService = async (userId, filters, paginationOptions) => {
  const UsageLog = (await import('../usage/usageLog.model.js')).default;
  const { module: mod, status, startDate, endDate } = filters;
  const { page, limit, skip } =
    paginationHelpers.calculatePagination(paginationOptions);

  const match = { userId: new mongoose.Types.ObjectId(userId) };
  if (mod) match.module = mod;
  if (status) match.status = status;
  if (startDate || endDate) {
    match.timestamp = {};
    if (startDate) match.timestamp.$gte = new Date(startDate);
    if (endDate) match.timestamp.$lte = new Date(endDate);
  }

  const [data, total] = await Promise.all([
    UsageLog.find(match).sort({ timestamp: -1 }).skip(skip).limit(limit),
    UsageLog.countDocuments(match),
  ]);

  return { meta: { page, limit, total }, data };
};

// ─────────────────────────────────────────────────────────────────────────────
// 5.9  Tenant Members List
// ─────────────────────────────────────────────────────────────────────────────
const getTenantMembersService = async (tenantId, paginationOptions) => {
  const UserUsageModel = (await import('../usage/userUsage.model.js')).default;
  const { page, limit, skip } =
    paginationHelpers.calculatePagination(paginationOptions);

  const query = { tenantId: new mongoose.Types.ObjectId(tenantId) };
  const [members, total] = await Promise.all([
    UserModel.find(query)
      .select('name email role createdAt avatar')
      .skip(skip)
      .limit(limit),
    UserModel.countDocuments(query),
  ]);

  // Attach today's request count per member
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const memberIds = members.map((m) => m._id);
  const usageToday = await UserUsageModel.find({
    userId: { $in: memberIds },
    date: today,
  });
  const usageMap = usageToday.reduce((acc, u) => {
    acc[u.userId.toString()] = u.requestsUsed;
    return acc;
  }, {});

  const data = members.map((m) => ({
    ...m.toObject(),
    requestsToday: usageMap[m._id.toString()] || 0,
  }));

  return { meta: { page, limit, total }, data };
};

// ─────────────────────────────────────────────────────────────────────────────
// 5.10  Remove Tenant Member
// ─────────────────────────────────────────────────────────────────────────────
const removeTenantMemberService = async (tenantId, userId) => {
  const Tenant = (await import('../tenant/tenant.model.js')).default;

  const user = await UserModel.findOneAndUpdate(
    { _id: userId, tenantId },
    { $set: { tenantId: null, tenantRole: null } },
    { new: true, select: 'name email' }
  );
  if (!user) throw new Error('Member not found in this tenant');

  await Tenant.findByIdAndUpdate(tenantId, {
    $inc: { 'usage.usersCount': -1 },
  });

  return user;
};

// ─────────────────────────────────────────────────────────────────────────────
// helpers for period → date range
// ─────────────────────────────────────────────────────────────────────────────
const periodToRange = (period = '7d') => {
  const now = new Date();
  const start = new Date();
  if (period === 'today') {
    start.setUTCHours(0, 0, 0, 0);
  } else if (period === '30d') {
    start.setDate(now.getDate() - 30);
  } else {
    start.setDate(now.getDate() - 7);
  }
  return { startDate: start, endDate: now };
};

// ─────────────────────────────────────────────────────────────────────────────
// 5.11  Platform Usage Summary
// ─────────────────────────────────────────────────────────────────────────────
const getPlatformUsageSummaryService = async (period = '7d') => {
  const UsageLog = (await import('../usage/usageLog.model.js')).default;
  const { startDate, endDate } = periodToRange(period);

  const [agg] = await UsageLog.aggregate([
    { $match: { timestamp: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: null,
        totalRequests: { $sum: 1 },
        successCount: {
          $sum: { $cond: [{ $eq: ['$status', 'success'] }, 1, 0] },
        },
        errorCount: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } },
        partialCount: {
          $sum: { $cond: [{ $eq: ['$status', 'partial'] }, 1, 0] },
        },
        avgDuration: { $avg: '$duration' },
        totalTokens: { $sum: '$tokensUsed' },
        activeUsers: { $addToSet: '$userId' },
      },
    },
    {
      $project: {
        _id: 0,
        totalRequests: 1,
        successCount: 1,
        errorCount: 1,
        partialCount: 1,
        avgDuration: { $round: ['$avgDuration', 0] },
        totalTokens: 1,
        activeUsers: { $size: '$activeUsers' },
        successRate: {
          $cond: [
            { $gt: ['$totalRequests', 0] },
            {
              $round: [
                {
                  $multiply: [
                    { $divide: ['$successCount', '$totalRequests'] },
                    100,
                  ],
                },
                1,
              ],
            },
            0,
          ],
        },
        errorRate: {
          $cond: [
            { $gt: ['$totalRequests', 0] },
            {
              $round: [
                {
                  $multiply: [
                    { $divide: ['$errorCount', '$totalRequests'] },
                    100,
                  ],
                },
                1,
              ],
            },
            0,
          ],
        },
      },
    },
  ]);

  return (
    agg || {
      totalRequests: 0,
      successCount: 0,
      errorCount: 0,
      partialCount: 0,
      avgDuration: 0,
      totalTokens: 0,
      activeUsers: 0,
      successRate: 0,
      errorRate: 0,
    }
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// 5.12  Usage by Module
// ─────────────────────────────────────────────────────────────────────────────
const getUsageByModuleService = async (period = '7d') => {
  const UsageLog = (await import('../usage/usageLog.model.js')).default;
  const { startDate, endDate } = periodToRange(period);

  const data = await UsageLog.aggregate([
    { $match: { timestamp: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: '$module',
        requestCount: { $sum: 1 },
        errorCount: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } },
        totalTokens: { $sum: '$tokensUsed' },
        avgDuration: { $avg: '$duration' },
      },
    },
    {
      $project: {
        module: '$_id',
        _id: 0,
        requestCount: 1,
        totalTokens: 1,
        avgDuration: { $round: ['$avgDuration', 0] },
        errorRate: {
          $cond: [
            { $gt: ['$requestCount', 0] },
            {
              $round: [
                {
                  $multiply: [
                    { $divide: ['$errorCount', '$requestCount'] },
                    100,
                  ],
                },
                1,
              ],
            },
            0,
          ],
        },
      },
    },
    { $sort: { requestCount: -1 } },
  ]);

  return data;
};

// ─────────────────────────────────────────────────────────────────────────────
// 5.13  Top Users by Usage
// ─────────────────────────────────────────────────────────────────────────────
const getTopUsersByUsageService = async (limit = 10, period = '7d') => {
  const UsageLog = (await import('../usage/usageLog.model.js')).default;
  const { startDate, endDate } = periodToRange(period);
  const n = Math.min(parseInt(limit), 50);

  const data = await UsageLog.aggregate([
    { $match: { timestamp: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: '$userId',
        requestCount: { $sum: 1 },
        totalTokens: { $sum: '$tokensUsed' },
        errorCount: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } },
      },
    },
    { $sort: { requestCount: -1 } },
    { $limit: n },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: '_id',
        as: 'user',
        pipeline: [{ $project: { name: 1, email: 1, avatar: 1 } }],
      },
    },
    { $unwind: { path: '$user', preserveNullAndEmpty: false } },
    {
      $project: {
        userId: '$_id',
        _id: 0,
        name: '$user.name',
        email: '$user.email',
        avatar: '$user.avatar',
        requestCount: 1,
        totalTokens: 1,
        errorCount: 1,
      },
    },
  ]);

  return data;
};

// ─────────────────────────────────────────────────────────────────────────────
// 5.14  Usage Log Browser
// ─────────────────────────────────────────────────────────────────────────────
const getUsageLogsService = async (filters, paginationOptions) => {
  const UsageLog = (await import('../usage/usageLog.model.js')).default;
  const { userId, tenantId, module: mod, status, startDate, endDate } = filters;
  const { page, limit, skip } =
    paginationHelpers.calculatePagination(paginationOptions);

  const match = {};
  if (userId) match.userId = new mongoose.Types.ObjectId(userId);
  if (tenantId) match.tenantId = new mongoose.Types.ObjectId(tenantId);
  if (mod) match.module = mod;
  if (status) match.status = status;
  if (startDate || endDate) {
    match.timestamp = {};
    if (startDate) match.timestamp.$gte = new Date(startDate);
    if (endDate) match.timestamp.$lte = new Date(endDate);
  }

  const [data, total] = await Promise.all([
    UsageLog.find(match)
      .populate('userId', 'name email')
      .populate('tenantId', 'name')
      .sort({ timestamp: -1 })
      .skip(skip)
      .limit(limit),
    UsageLog.countDocuments(match),
  ]);

  return { meta: { page, limit, total }, data };
};

// ─────────────────────────────────────────────────────────────────────────────
// 5.15  Daily Usage Breakdown
// ─────────────────────────────────────────────────────────────────────────────
const getDailyUsageService = async (period = '7d') => {
  const UsageLog = (await import('../usage/usageLog.model.js')).default;
  const { startDate, endDate } = periodToRange(period);

  const data = await UsageLog.aggregate([
    { $match: { timestamp: { $gte: startDate, $lte: endDate } } },
    {
      $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
        requests: { $sum: 1 },
        errors: { $sum: { $cond: [{ $eq: ['$status', 'error'] }, 1, 0] } },
        tokens: { $sum: '$tokensUsed' },
      },
    },
    { $sort: { _id: 1 } },
    { $project: { _id: 0, date: '$_id', requests: 1, errors: 1, tokens: 1 } },
  ]);

  return data;
};

// ─────────────────────────────────────────────────────────────────────────────
// Update Tenant Settings
// ─────────────────────────────────────────────────────────────────────────────
const updateTenantSettingsService = async (tenantId, settingsPayload) => {
  const Tenant = (await import('../tenant/tenant.model.js')).default;
  const updateData = {};
  const s = settingsPayload ?? {};
  if (s.allowMemberInvites !== undefined)
    updateData['settings.allowMemberInvites'] = s.allowMemberInvites;
  if (s.requireApproval !== undefined)
    updateData['settings.requireApproval'] = s.requireApproval;
  if (s.maxMembers !== undefined)
    updateData['settings.maxMembers'] = s.maxMembers;
  if (s.customBranding?.logo !== undefined)
    updateData['settings.customBranding.logo'] = s.customBranding.logo;
  if (s.customBranding?.primaryColor !== undefined)
    updateData['settings.customBranding.primaryColor'] =
      s.customBranding.primaryColor;
  const tenant = await Tenant.findByIdAndUpdate(
    tenantId,
    { $set: updateData },
    { new: true }
  );
  if (!tenant) throw new Error('Tenant not found');
  return tenant;
};

// ====================

// Make User Admin / Super Admin Service
const makeUserAdminService = async (
  currentUser,
  targetUserId,
  role = 'admin'
) => {
  // Only super_admin can make admin/super_admin
  if (currentUser.role !== 'super_admin') {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'Only super admin can change user roles'
    );
  }

  // Validate role
  const allowedRoles = ['admin', 'user'];

  if (!allowedRoles.includes(role)) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Invalid role provided');
  }

  // Find target user
  const user = await UserModel.findById(targetUserId);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Prevent changing another super_admin
  if (user.role === 'super_admin') {
    throw new ApiError(
      httpStatus.BAD_REQUEST,
      'Cannot modify super admin role'
    );
  }

  // Update role
  user.role = role;

  await user.save();

  return {
    success: true,
    message: `User role updated to ${role}`,
    data: {
      _id: user._id,
      email: user.email,
      role: user.role,
    },
  };
};

// Delete Any User Service
const deleteAnyUserService = async (currentUser, targetUserId) => {
  // Only super_admin can delete users
  if (currentUser.role !== 'super_admin') {
    throw new ApiError(
      httpStatus.FORBIDDEN,
      'Only super admin can delete users'
    );
  }

  // Prevent self delete
  if (currentUser._id.toString() === targetUserId.toString()) {
    throw new ApiError(httpStatus.BAD_REQUEST, 'You cannot delete yourself');
  }

  const user = await UserModel.findById(targetUserId);

  if (!user) {
    throw new ApiError(httpStatus.NOT_FOUND, 'User not found');
  }

  // Prevent deleting another super_admin
  if (user.role === 'super_admin') {
    throw new ApiError(httpStatus.BAD_REQUEST, 'Cannot delete super admin');
  }

  // Delete related tokens
  await Token.deleteMany({ userId: targetUserId });

  // Delete tenant memberships
  await TenantMember.deleteMany({ userId: targetUserId });

  // Delete user
  await UserModel.deleteOne({ _id: targetUserId });

  return {
    success: true,
    message: 'User deleted successfully',
  };
};

export const AdminService = {
  getAllUsersService,
  getAllBuyerServices,
  getSellerServiceById,
  updateUserRoleService,
  makeAdminService,
  deleteUserService,
  getAdminServices,
  getUserStatisticsByMonthService,
  getAllPaymentService,
  getAllTenantsService,
  getTenantDetailsService,
  updateTenantStatusService,
  getTenantUsageService,
  extendTenantTrialService,
  updateTenantSettingsService,
  // New — 5.4–5.14
  getUserDetailService,
  updateUserService,
  resetUserLimitService,
  getUserUsageService,
  getUserUsageLogsService,
  getTenantMembersService,
  removeTenantMemberService,
  getPlatformUsageSummaryService,
  getUsageByModuleService,
  getTopUsersByUsageService,
  getUsageLogsService,
  getDailyUsageService,
  deleteAnyUserService,
  makeUserAdminService,
};
