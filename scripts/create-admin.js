/**
 * create-admin.js — creates or promotes a user to admin/super_admin
 *
 * Usage:
 *   node scripts/create-admin.js
 *   node scripts/create-admin.js --email=you@example.com --password=Secret123 --role=super_admin
 *
 * Flags (all optional — falls back to prompts):
 *   --email       user email
 *   --password    plain-text password (min 8 chars)
 *   --name        display name (default: "Admin")
 *   --role        admin | super_admin (default: admin)
 *   --promote     if set, only change role of existing user (no new user created)
 */

import 'dotenv/config';
import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import readline from 'readline/promises';
import { stdin as input, stdout as output } from 'process';

// ─── Config ────────────────────────────────────────────────────────────────

const DB_URI =
  process.env.DATABASE_LOCAL ||
  process.env.MONGODB_URI ||
  'mongodb+srv://ason-db-username:2kep7suGSMneEHq8@cluster0.piwgo1l.mongodb.net/ASON?retryWrites=true&w=majority&appName=Cluster0';

// ─── Parse CLI flags ────────────────────────────────────────────────────────

function parseArgs() {
  const args = {};
  for (const arg of process.argv.slice(2)) {
    const [key, ...rest] = arg.replace(/^--/, '').split('=');
    args[key] = rest.join('=') || true;
  }
  return args;
}

// ─── Inline User model (mirrors auth.model.js exactly) ─────────────────────

function getUserModel() {
  if (mongoose.models['User']) return mongoose.models['User'];

  const schema = new mongoose.Schema(
    {
      provider: String,
      providerId: String,
      avatar: String,
      email: { type: String, required: true, unique: true },
      password: { type: String, select: false },
      name: { type: String },
      isSubscribed: { type: Boolean, default: false },
      freePlanUsage: {
        promptsUsed: { type: Number, default: 0 },
        imagesUsed: { type: Number, default: 0 },
        lastResetAt: { type: Date, default: Date.now },
      },
      dailyRequestLimit: {
        requestsUsed: { type: Number, default: 0 },
        maxRequests: { type: Number, default: 10 },
        lastResetAt: { type: Date, default: Date.now },
      },
      role: {
        type: String,
        enum: ['user', 'buyer', 'admin', 'super_admin', 'unauthorized'],
        default: 'unauthorized',
      },
      tenantId: { type: mongoose.Schema.Types.ObjectId, ref: 'Tenant', default: null },
      tenantRole: { type: String, enum: ['owner', 'admin', 'member'], default: null },
    },
    { timestamps: true }
  );

  return mongoose.model('User', schema);
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
  const flags = parseArgs();
  const rl = readline.createInterface({ input, output });

  const ask = async (prompt, defaultVal) => {
    const answer = await rl.question(
      defaultVal ? `${prompt} [${defaultVal}]: ` : `${prompt}: `
    );
    return answer.trim() || defaultVal || '';
  };

  const askSecret = async (prompt) => {
    // readline/promises doesn't support hidden input natively;
    // we print a warning so the user is aware.
    process.stdout.write(`${prompt} (input visible): `);
    const answer = await rl.question('');
    return answer.trim();
  };

  console.log('\n🔧  Alti Admin — Create / Promote Admin User\n');

  // Collect inputs
  const email = flags.email || (await ask('Email'));
  const role =
    flags.role && ['admin', 'super_admin'].includes(flags.role)
      ? flags.role
      : (await ask('Role (admin / super_admin)', 'admin')) || 'admin';
  const promoteOnly = flags.promote === true || flags.promote === 'true';

  let password = '';
  let name = flags.name || 'Admin';

  if (!promoteOnly) {
    name = flags.name || (await ask('Name', 'Admin'));
    password = flags.password || (await askSecret('Password (min 8 chars)'));
    if (password.length < 8) {
      console.error('\n❌  Password must be at least 8 characters.');
      process.exit(1);
    }
  }

  rl.close();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    console.error('❌  Invalid email address.');
    process.exit(1);
  }

  // Connect
  console.log('\n⏳  Connecting to MongoDB…');
  await mongoose.connect(DB_URI);
  console.log('✅  Connected.\n');

  const User = getUserModel();

  // Check existing
  const existing = await User.findOne({ email }).select('+password');

  if (promoteOnly) {
    if (!existing) {
      console.error(`❌  No user found with email "${email}".`);
      await mongoose.disconnect();
      process.exit(1);
    }
    existing.role = role;
    await existing.save();
    console.log(`✅  User "${email}" role updated to "${role}".`);
  } else if (existing) {
    // User exists — just promote
    console.log(`ℹ️   User already exists. Updating role to "${role}"…`);
    existing.role = role;
    if (name && name !== 'Admin') existing.name = name;
    await existing.save();
    console.log(`✅  User "${email}" role set to "${role}".`);
  } else {
    // Create new user
    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await User.create({
      email,
      password: hashedPassword,
      name,
      role,
      provider: 'credentials',
    });
    console.log(`✅  Admin user created:`);
    console.log(`    ID:    ${user._id}`);
    console.log(`    Email: ${user.email}`);
    console.log(`    Name:  ${user.name}`);
    console.log(`    Role:  ${user.role}`);
  }

  await mongoose.disconnect();
  console.log('\n👋  Done.\n');
}

main().catch((err) => {
  console.error('❌  Fatal error:', err.message);
  process.exit(1);
});
