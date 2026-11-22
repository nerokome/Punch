"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendAdminUserSetPasswordLinkEmail = exports.sendDefaultEmail = exports.sendEmailVerificationLinkEmail = void 0;
const crypto_1 = __importDefault(require("crypto"));
const utils_1 = require("../utils");
const sendEmailVerificationLinkEmail = async (data) => {
    const token = crypto_1.default.randomBytes(32).toString("hex");
    // await createUserTokenService(data.id, token);
    // const verificationURL = `${process.env.FRONTEND_BASE_URL}/login/${data.id}/${token}`;
    const message = `
      <h1>Your account has been created with Outcess ATS</h1>
      <p>Please click on the link below to verify your email. 🙃😎🔥</p>
      <a href=https://google.com clicktracking=off>Google</a>
    `;
    (0, utils_1.sendEmail)({
        to: data.email,
        subject: "Outcess ATS",
        html: message,
    });
};
exports.sendEmailVerificationLinkEmail = sendEmailVerificationLinkEmail;
const sendDefaultEmail = async (data) => {
    const messageBody = `
      <p>${data.message}</p>
    `;
    (0, utils_1.sendEmail)({
        to: data.email,
        subject: data.subject,
        html: messageBody,
    });
};
exports.sendDefaultEmail = sendDefaultEmail;
const sendAdminUserSetPasswordLinkEmail = async (userID, email) => {
    const setPasswordLink = `${process.env.DASHBOARD_BASE_URL}/set-password/${userID}`;
    const message = `
        <h1>An admin has invited you to join OUTCESS-ATS</h1>
        <p>Please click on the link below to set your password. 😋🤡🔥</p>
        <a href=${setPasswordLink} clicktracking=off>${setPasswordLink}</a>
    `;
    (0, utils_1.sendEmail)({
        to: email,
        subject: "Outcess-ATS Email verification",
        html: message,
    });
};
exports.sendAdminUserSetPasswordLinkEmail = sendAdminUserSetPasswordLinkEmail;
