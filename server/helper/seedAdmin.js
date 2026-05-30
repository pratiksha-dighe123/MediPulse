import dotenv from "dotenv";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import dbConnect from "../utils/dbConnect.js";
import Admin from "../models/adminModel.js";

dotenv.config();

const run = async () => {
  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  const name = process.env.ADMIN_NAME || "System Admin";

  if (!email || !password) {
    throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD in environment variables before seeding");
  }

  await dbConnect();

  const hashedPassword = await bcrypt.hash(password, 10);
  const existingAdmin = await Admin.findOne({ email });

  if (existingAdmin) {
    existingAdmin.name = name;
    existingAdmin.password = hashedPassword;
    existingAdmin.role = "admin";
    await existingAdmin.save();
    console.log("Admin account updated successfully");
  } else {
    await Admin.create({
      name,
      email,
      password: hashedPassword,
      role: "admin",
    });
    console.log("Admin account created successfully");
  }
};

run()
  .catch((error) => {
    console.error("Admin seeding failed:", error.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await mongoose.connection.close();
  });
