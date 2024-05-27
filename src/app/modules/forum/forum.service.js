const paginationHelpers = require('../../helpers/paginationHelpers');
const Forum = require('./forum.model');
const UserForumActivities = require('./forumUserActivities.model');

module.exports.getForumService = async (filters, paginationOptions) => {
  const { searchTerm, ...filtersData } = filters;

  const productsSearchAbleFields = ['title', 'category'];
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

  // if (Object.keys(filtersData).length) {
  //     andConditions.push({
  //         $and: Object.entries(filtersData).map(([field, value]) => ({
  //             [field]: value,
  //         })),
  //     });
  // }

  const { page, limit, skip, sortBy, sortOrder } =
    paginationHelpers.calculatePagination(paginationOptions);

  const sortConditions = {};
  if (sortBy && sortOrder) {
    sortConditions[sortBy] = sortOrder;
  }

  const forumData = await Forum.find({ $and: andConditions })
    .populate('author')
    .populate('userActivities')
    .sort(sortConditions)
    .skip(skip)
    .limit(limit);

    
  // console.log(blogData)
  const total = await Forum.estimatedDocumentCount();
  return {
    meta: {
      page,
      limit,
      total,
    },
    data: forumData,
  };
};

module.exports.addForumServices = async data => {
  // console.log(data, 'blog dataaa')
  const result = await Forum.create(data);
  // console.log(result, "dataasss")
  return result;
};

module.exports.getForumServiceById = async id => {
  const result = await Forum.findOne({ _id: id });
  // console.log(result, 'resultt blog details')
  return result;
};

module.exports.getForumServiceByEmail = async email => {
  const result = await Forum.find({ authorEmail: email });
  // console.log(result, 'resultt blog details')
  return result;
};

module.exports.updateForumService = async (storeId, data) => {
  const result = await Forum.updateOne(
    { _id: storeId },
    { $set: data },
    { runValidators: true },
  );

  return result;
};

exports.deleteForumService = async id => {
  const result = await Forum.deleteOne({ _id: id });
  return result;
};

module.exports.getForumSuggestionService = async name => {
  const result = await Forum.find({ category: name }).limit(3);
  return result;
};

module.exports.addUserForumActivityServices = async data => {
  // Check if the user already has a store
  // const existingStore = await Blogs.findOne({ email: email });

  // if (existingStore) {
  //     return { error: 'One user can add one comment' };
  // }
  console.log(data, 'dataaaaa');

  const result = await UserForumActivities.create(data);
  // console.log(result, "resulttttt comment")
  return result;
};

module.exports.getCommnetService = async commentId => {
  // console.log(commentId, "commentId")
  const result = await UserForumActivities.find({ id: commentId });
  // console.log(result, "commentssssssss")
  return result;
};

module.exports.deleteCommentServices = async (email, data) => {
  const result = await UserForumActivities.deleteOne({ _id: id });
  return result;
};
