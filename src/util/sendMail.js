import nodemailer from "nodemailer";
import { config } from "dotenv";
config();

export const sendMail = async (mailOptions) => {
  try {
    const transporter = nodemailer.createTransport({
      host: "smtp.hostinger.com",
      port: 465, // or 587
      secure: true, // true for 465, false for 587
      auth: {
        user: process.env.EMAIL,
        pass: process.env.PASSWORD,
      },
    });
    await transporter.sendMail(mailOptions);
    return true;
  } catch (error) {
    console.log("error", error);
    
    throw new Error("Something went wrong");
  }
};
