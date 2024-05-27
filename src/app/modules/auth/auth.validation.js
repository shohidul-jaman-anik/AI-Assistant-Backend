const zod = require('zod');
const { z } = zod;

const userRoleValues = ['tenant', 'landlord', 'admin', 'unauthorized'];
const genderValues = ['Male', 'Female'];

const UserValidationSchema = z.object({
  body: z.object({
    firstName: z.string(),
    lastName: z.string(),
    password: z
      .string()
      .refine(value => value !== undefined, {
        message: 'Please provide a password',
      }),
    email: z
      .string()
      .email()
      .refine(value => value !== undefined, {
        message: 'Please provide a unique email',
      }),
    role: z.enum(userRoleValues).default('unauthorized'),
    landlord: z.boolean(),
    mobile: z.number(),
    address: z.string(),
    gender: z.enum(genderValues),
    profile: z.string(),
    confirmationToken: z.string().optional(),
    confirmationTokenExpires: z.date().optional(),
  }),
});

module.exports = UserValidationSchema;
