import UserModel from '../auth/auth.model.js';
async function findOrCreateUserModel(profile, provider) {
  try {
    console.log(provider, 'providerrrrrrrrrrrrrrrrrrrrr');
    console.log(profile, 'profileeeeeeeeeeeeeeeeeeeeeee');
    // 1. First check by provider ID
    let user = await UserModel.findOne({
      provider: provider,
      providerId: profile.id,
    });

    if (user) return user;

    // 2. Check by email if exists in profile
    const email = profile.emails?.[0]?.value;
    if (email) {
      user = await UserModel.findOne({
        email: email,
        provider: provider,
      });

      if (user) {
        // Update existing record with new provider ID
        user.providerId = profile.id;
        return await user.save();
      }
    }
    // 3. Create new social user with required fields
    return await UserModel.create({
      role: 'user',
      provider: provider,
      providerId: profile.id || 'some',
      email: email || `${provider}_${profile.id}@social.user`, // Fallback email
      name: profile.displayName || profile.username || 'pranplaceholder',
      avatar: profile.photos?.[0]?.value || '',
    });
  } catch (error) {
    throw new Error(`Social auth failed: ${error.message}`);
  }
}

async function getUser(req, res, next) {
  try {
    const userId = req.params?.userId;
    console.log(userId, 'userId');

    if (!userId) {
      return res.status(501).send({ error: 'Require Id' });
    }

    const user = await UserModel.findOne({ providerId: userId });

    if (!user) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ error: "Couldn't Find the User" });
    }

    // Remove password from user
    const { llamaAiSessions, notes, password, ...rest } = Object.assign(
      {},
      user.toJSON(),
    );

    return res.status(201).send(rest);
  } catch (error) {
    console.error(error); // Log the error for debugging purposes
    return res.status(404).send({ error: 'Cannot Find User Data' });
  }
}

async function getUserByEmail(req, res, next) {
  try {
    const userEmail = req.params?.userEmail;
    console.log(userEmail, 'userId');

    if (!userEmail) {
      return res.status(501).send({ error: 'Require Id' });
    }

    const user = await UserModel.findOne({ email: userEmail });

    if (!user) {
      return res
        .status(httpStatus.NOT_FOUND)
        .send({ error: "Couldn't Find the User" });
    }

    // Remove password, notes, and llamaAiSessions from user
    const { llamaAiSessions, notes, password, ...rest } = Object.assign(
      {},
      user.toJSON(),
    );

    return res.status(201).send(rest);
  } catch (error) {
    console.error(error); // Log the error for debugging purposes
    return res.status(404).send({ error: 'Cannot Find User Data' });
  }
}

export { findOrCreateUserModel, getUser, getUserByEmail };
