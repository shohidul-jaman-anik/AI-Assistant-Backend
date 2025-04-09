import paginationHelpers from "../../helpers/paginationHelpers.js";
import UserModel from "../auth/auth.model.js";

// ===========================================
//                  All Users
//============================================

const getAllUsersService = async (filters, paginationOptions) => {
  const { searchTerm } = filters;

  const productsSearchAbleFields = ['email', 'firstName', 'lastName'];
  const andConditions = [];

  // Add a default condition if andConditions is empty
  if (andConditions.length === 0) {
    andConditions.push({});
  }

  if (searchTerm) {
    andConditions.push({
      $or: productsSearchAbleFields.map(field => ({
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
    .sort(sortConditions)
    .skip(skip)
    .limit(limit);

  const total = await UserModel.estimatedDocumentCount();
  const totalSeller = await UserModel.countDocuments({
    $and: [{ seller: true }, { role: 'seller' }],
  });
  const totalBuyer = await UserModel.countDocuments({ role: 'buyer' });
  const unverifyUsers = await UserModel.countDocuments({
    role: 'unauthorized',
  });
  return {
    meta: {
      page,
      limit,
      total,
      totalSeller,
      totalBuyer,
      unverifyUsers,
    },
    data: users,
  };
};

const updateUserRoleService = async (id, userRole) => {
  const filter = { _id: id };
  const updateDoc = {
    $set: { role: userRole },
  };
  const result = await UserModel.updateOne(filter, updateDoc, {
    runValidators: true,
  });
  return result;
};

//===================  Buyer =========================
const getAllBuyerServices = async () => {
  const result = await UserModel.find({ role: 'buyer' });
  return result;
};

//====================  Admin ========================

const getSellerServiceById = async id => {
  const result = await UserModel.findOne({ _id: id });
  console.log(result);
  return result;
};

const makeAdminService = async userId => {
  const filter = { _id: userId };
  const updateDoc = {
    $set: { role: 'admin', seller: true },
  };
  const result = await UserModel.updateOne(filter, updateDoc, {
    runValidators: true,
  });
  return result;
};

const deleteUserService = async id => {
  const result = await UserModel.deleteOne({ _id: id });
  return result;
};

//==================== Sup Admin ========================

const getAdminServices = async email => {
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

export const AdminService = {
  getAllUsersService,
  updateUserRoleService,
  getAllBuyerServices,
  getSellerServiceById,
  makeAdminService,
  deleteUserService,
  getAdminServices,
};
