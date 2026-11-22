"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userUpdatePasswordSchema = exports.adminUpdateUserSchema = exports.userUpdateProfileSchema = exports.getUsersSchema = exports.registerUserSchema = exports.organizationSignupSchema = exports.loginSchema = void 0;
const express_validator_1 = require("express-validator");
const loginSchema = () => {
    return [
        (0, express_validator_1.body)("email").isEmail().withMessage("Please provide an email"),
        (0, express_validator_1.body)("password").notEmpty().withMessage("Please provide a password"),
    ];
};
exports.loginSchema = loginSchema;
const organizationSignupSchema = () => [
    (0, express_validator_1.body)("organizationName").trim().isLength({ min: 2, max: 120 }).withMessage("Organization name must be 2 to 120 characters"),
    (0, express_validator_1.body)("name").trim().notEmpty().withMessage("Your name is required"),
    (0, express_validator_1.body)("email").trim().isEmail().withMessage("A valid email is required"),
    (0, express_validator_1.body)("phone").trim().notEmpty().withMessage("Phone number is required"),
    (0, express_validator_1.body)("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
    (0, express_validator_1.body)("gender").isIn(["Male", "Female"]).withMessage("Choose a gender"),
];
exports.organizationSignupSchema = organizationSignupSchema;
const registerUserSchema = () => {
    return [
        (0, express_validator_1.body)("name").notEmpty().withMessage("Name is required"),
        (0, express_validator_1.body)("officeId").notEmpty().withMessage("Office ID is required"),
        (0, express_validator_1.body)("email").isEmail().withMessage("A valid email is required"),
        (0, express_validator_1.body)("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
        (0, express_validator_1.body)("phone").notEmpty().withMessage("Phone number is required"),
        (0, express_validator_1.body)("role").notEmpty().withMessage("Role is required"),
        (0, express_validator_1.body)("gender").optional(),
    ];
};
exports.registerUserSchema = registerUserSchema;
const getUsersSchema = () => {
    return [
        (0, express_validator_1.query)("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
        (0, express_validator_1.query)("limit").optional().isInt({ min: 1 }).withMessage("Limit must be a positive integer"),
        (0, express_validator_1.query)("search").optional().isString().withMessage("Search must be a string"),
    ];
};
exports.getUsersSchema = getUsersSchema;
const userUpdateProfileSchema = () => {
    return [
        (0, express_validator_1.body)("name")
            .optional()
            .isString()
            .withMessage("First name must be a string"),
        (0, express_validator_1.body)("gender")
            .optional()
            .isIn(["Male", "Female"])
            .withMessage("Gender must be either 'Male' or 'Female'"),
    ];
};
exports.userUpdateProfileSchema = userUpdateProfileSchema;
const adminUpdateUserSchema = () => {
    return [
        (0, express_validator_1.body)("name").optional().isString().withMessage("Name must be a string"),
        (0, express_validator_1.body)("email").optional().isEmail().withMessage("A valid email is required"),
        (0, express_validator_1.body)("phone").optional().isString().withMessage("Phone must be a string"),
        (0, express_validator_1.body)("gender")
            .optional()
            .isIn(["Male", "Female"])
            .withMessage("Gender must be 'Male' or 'Female'"),
        (0, express_validator_1.body)("officeId").optional().isString().withMessage("Office ID must be a string"),
        (0, express_validator_1.body)("role")
            .optional()
            .isIn(["ADMIN", "SUPER_ADMIN", "AGENT"])
            .withMessage("Role must be ADMIN, SUPER_ADMIN, or AGENT"),
        (0, express_validator_1.body)("isActive")
            .optional()
            .isIn(["active", "deactivated", "resigned"])
            .withMessage("isActive must be 'active', 'deactivated', or 'resigned'"),
    ];
};
exports.adminUpdateUserSchema = adminUpdateUserSchema;
const userUpdatePasswordSchema = () => {
    return [
        (0, express_validator_1.body)("oldPassword")
            .notEmpty()
            .withMessage("Please provide oldPassword"),
        (0, express_validator_1.body)("newPassword")
            .notEmpty()
            .withMessage("Please provide newPassword"),
    ];
};
exports.userUpdatePasswordSchema = userUpdatePasswordSchema;
