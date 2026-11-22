"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendEmail = void 0;
const logger_1 = __importDefault(require("../logger"));
const mail_1 = __importDefault(require("@sendgrid/mail"));
require("dotenv").config();
// export const sendEmail = (options: any) => {
//   const transporter = nodemailer.createTransport({
//     service: process.env.EMAIL_SERVICE,
//     auth: {
//       user: process.env.EMAIL_USERNAME,
//       pass: process.env.EMAIL_PASSWORD,
//     },
//   });
//   const mailOptions = {
//     from: process.env.EMAIL_FROM,
//     to: options.to,
//     subject: options.subject,
//     html: options.html,
//   };
//   transporter.sendMail(mailOptions, (err, info) => {
//     if (err) Logger.error(err);
//     else Logger.info(info);
//   });
// };
// using Twilio SendGrid's v3 Node.js Library
// https://github.com/sendgrid/sendgrid-nodejs
// sgMail.setApiKey(process.env.SENDGRID_API_KEY)
const sendEmail = (options) => {
    mail_1.default.setApiKey(process.env.EMAIL_PASSWORD);
    const mailOptions = {
        to: options.to, // Change to your recipient
        from: process.env.EMAIL_FROM || 'mail.service@outcess.com', // Change to your verified sender
        subject: options.subject,
        text: options.text,
        html: options.html,
    };
    mail_1.default
        .send(mailOptions)
        .then(() => {
        // console.log('Email sent')
        logger_1.default.info('Email sent Successfully!');
    })
        .catch((error) => {
        // console.error(error)
        logger_1.default.error(error);
    });
};
exports.sendEmail = sendEmail;
