
const paginationHelpers = require("../../helpers/paginationHelpers");
const UserModel = require("./auth.model");


exports.getAllUsersService = async (filters, paginationOptions) => {


    const { searchTerm } = filters

    const productsSearchAbleFields = ['username', 'email'];
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

    const { page, limit, skip, sortBy, sortOrder } = paginationHelpers.calculatePagination(paginationOptions)

    const sortConditions = {};
    if (sortBy && sortOrder) {
        sortConditions[sortBy] = sortOrder;
    }

    const users = await UserModel.find({ $and: andConditions }).sort(sortConditions).skip(skip).limit(limit)

    const total = await UserModel.estimatedDocumentCount()
    const totalSeller = await UserModel.countDocuments({ $and: [{ seller: true }, { role: 'seller' }] })
    const totalBuyer = await UserModel.countDocuments({ role: "buyer" })
    return {
        meta: {
            page,
            limit,
            total,
            totalSeller,
            totalBuyer
        },
        data: users
    };
}