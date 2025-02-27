import UserModel from '../../modules/auth/auth.model.js';

export const checkFreePlanLimits = async (userId, type) => {
    const user = await UserModel.findById(userId);
  
    if (!user) {
      throw new Error('User not found.');
    }
  
    // Check if the user is on a free plan (no active subscription):-
    if (!user.isSubscribed) {
  
      // Check limits based on the type (prompt or image)
      if (type === 'prompt' && user.freePlanUsage.promptsUsed >= 10) {
        throw new Error('Free plan prompt limit reached. Please subscribe to continue.');
      }
  
      if (type === 'image' && user.freePlanUsage.imagesUsed >= 1) {
        throw new Error('Free plan image limit reached. Please subscribe to continue.');
      }
    }
  
    return user;
};