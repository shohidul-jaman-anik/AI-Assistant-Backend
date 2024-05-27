const pick = require('../../middlewares/other/pick');
const { paginationFields } = require('./admin.constant');
const {
  getAdminServices,
  deleteUserService,
  updateUserRoleService,
  getAllUsersService,
  makeAdminService,
  getAllBuyerServices,
} = require('./admin.service');

const getAllUser = async (req, res, next) => {
  try {
    // const buyers = await UserModel.findOne({ role: 'buyer' })
    const buyers = await getAllBuyerServices();
    res.status(200).json({
      status: 'Success',
      message: 'All user get Successfully',
      data: buyers,
    });
  } catch (error) {
    res.status(400).json({
      status: 'Fail',
      message: "All user couldn't found Successfully",
      error: error.message,
    });
  }
};

const makeAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const filter = { _id: id };

    const result = makeAdminService(filter);
    res.status(200).json({
      status: 'Success',
      message: 'Create admin successfully',
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      status: 'Fail',
      message: "Couldn't make admin successfully",
      error: error.message,
    });
    console.log(error, 'error');
  }
};
const deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await deleteUserService(id);

    if (!result.deletedCount) {
      return res.status(400).json({
        status: 'fail',
        error: "Could't delete the user",
      });
    }
    res.status(200).json({
      status: 'Success',
      message: 'User Delete Successfully',
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      status: 'Fail',
      message: "User couldn't Delete Successfully",
      error: error.message,
    });
    console.log(error, 'error');
  }
};

const getAllUsers = async (req, res, next) => {
  try {
    const filters = pick(req.query, [
      'searchTerm',
      'email',
      'firstName',
      'lastName',
    ]);

    const paginationOptions = pick(req.query, paginationFields);

    const users = await getAllUsersService(filters, paginationOptions);
    res.status(200).json({
      status: 'Success',
      message: 'Users find Successfully',
      meta: users.meta,
      data: users.data,
    });
  } catch (error) {
    res.status(400).json({
      status: 'Fail',
      message: "Users couldn't found Successfully",
      error: error.message,
    });
  }
};

const updateUserRole = async (req, res) => {
  try {
    const { id } = req.params;
    // console.log(id, 'userRole iddddddddddd');
    const userRole = req.body.role;
    // console.log(userRole, 'user userRole');

    const result = await updateUserRoleService(id, userRole);
    res.status(200).json({
      status: 'Success',
      message: 'Update Role successfully',
      data: result,
    });
  } catch (error) {
    res.status(400).json({
      status: 'Fail',
      message: "Couldn't update Role",
      error: error.message,
    });
    console.log(error, 'error');
  }
};

const getAdmin = async (req, res, next) => {
  try {
    const { email } = req.params;
    // console.log(email, 'admin email');
    const admin = await getAdminServices(email);
    res.status(200).json({
      status: 'Success',
      message: 'Admin get Successfully',
      data: admin,
    });
  } catch (error) {
    res.status(400).json({
      status: 'Fail',
      message: "Admin couldn't found Successfully",
      error: error.message,
    });
  }
};

module.exports.adminController = {
  makeAdmin,
  getAllUser,
  deleteUser,
  getAllUsers,
  updateUserRole,
  getAdmin,
};
