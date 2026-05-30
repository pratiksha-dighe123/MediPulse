import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';
import Admin from '../models/adminModel.js';
import dbConnect from '../utils/dbConnect.js';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);
const serverDir = path.dirname(currentDirPath);
dotenv.config({ path: path.join(serverDir, '.env') });

const seedAdminWithCredentials = async () => {
  try {
    await dbConnect();

    const adminEmail = 'admin@gmail.com';
    const adminPassword = 'Admin@2005';
    const adminName = 'System Admin';
    const normalizedEmail = adminEmail.toLowerCase();

    const hashedPassword = await bcrypt.hash(adminPassword, 10);

    const existingAdmin = await Admin.findOne({ email: normalizedEmail });
    if (existingAdmin) {
      existingAdmin.name = existingAdmin.name || adminName;
      existingAdmin.email = normalizedEmail;
      existingAdmin.password = hashedPassword;
      existingAdmin.role = 'admin';
      await existingAdmin.save();

      console.log(`Admin updated successfully with email: ${normalizedEmail}`);
      console.log('Password reset to: Admin@2005');
      process.exit(0);
    }

    const newAdmin = new Admin({
      name: adminName,
      email: normalizedEmail,
      password: hashedPassword,
      role: 'admin',
    });

    await newAdmin.save();
    console.log(`Admin created successfully with email: ${normalizedEmail}`);
    console.log('Password: Admin@2005');
    process.exit(0);
  } catch (error) {
    console.error('Error seeding admin:', error.message);
    process.exit(1);
  }
};

seedAdminWithCredentials();
