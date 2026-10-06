import bcrypt from 'bcryptjs';
import Admin from '../models/admin.model.js';

const DEFAULT_ADMIN = {
  firstName: 'Farhad',
  lastName: 'Nuri',
  email: 'farhadadmin55@gmail.com', // your admin email
  password: '55TTww$$$',   // your plain password
  role: 'admin',
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
};

const seedAdmin = async () => {
  try {
    const existingAdmin = await Admin.findOne({ email: DEFAULT_ADMIN.email });
    if (existingAdmin) {
      console.log(`👤 Admin already exists: ${existingAdmin.email}`);
      return existingAdmin;
    }

    const hashedPassword = await bcrypt.hash(DEFAULT_ADMIN.password, 10);

    const admin = await Admin.create({
      ...DEFAULT_ADMIN,
      password: hashedPassword,
    });

    console.log(`👤 Admin seeded successfully: ${admin.email}`);
    return admin;
  } catch (error) {
    console.error('💥 Failed to seed admin:', error.message);
    throw error;
  }
};

export default seedAdmin