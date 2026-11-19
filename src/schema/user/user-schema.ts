import { body, query } from "express-validator";

export const loginSchema = () => {
    return [
      body("email").isEmail().withMessage("Please provide an email"),
      body("password").notEmpty().withMessage("Please provide a password"),
    ];
};

export const registerUserSchema = () => {
    return [
      body("name").notEmpty().withMessage("Name is required"),
      body("officeId").notEmpty().withMessage("Office ID is required"),
      body("email").isEmail().withMessage("A valid email is required"),
      body("password").isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
      body("phone").notEmpty().withMessage("Phone number is required"),
      body("role").notEmpty().withMessage("Role is required"),
      body("gender").optional(),
    ];
};

export const getUsersSchema = () => {
    return [
      query("page").optional().isInt({ min: 1 }).withMessage("Page must be a positive integer"),
      query("limit").optional().isInt({ min: 1 }).withMessage("Limit must be a positive integer"),
      query("search").optional().isString().withMessage("Search must be a string"),
    ];
};

export const userUpdateProfileSchema = () => {
  return [
    body("name")
      .optional()
      .isString()
      .withMessage("First name must be a string"),

    body("gender")
      .optional()
      .isIn(["Male", "Female"])
      .withMessage("Gender must be either 'Male' or 'Female'"),

  ];
};

export const adminUpdateUserSchema = () => {
  return [
    body("name").optional().isString().withMessage("Name must be a string"),
    body("email").optional().isEmail().withMessage("A valid email is required"),
    body("phone").optional().isString().withMessage("Phone must be a string"),
    body("gender")
      .optional()
      .isIn(["Male", "Female"])
      .withMessage("Gender must be 'Male' or 'Female'"),
    body("officeId").optional().isString().withMessage("Office ID must be a string"),
    body("role")
      .optional()
      .isIn(["ADMIN", "SUPER_ADMIN", "AGENT"])
      .withMessage("Role must be ADMIN, SUPER_ADMIN, or AGENT"),
    body("isActive")
      .optional()
      .isIn(["active", "deactivated", "resigned"])
      .withMessage("isActive must be 'active', 'deactivated', or 'resigned'"),
  ];
};

export const userUpdatePasswordSchema = () => {
  return [
    body("oldPassword")
      .notEmpty()
      .withMessage("Please provide oldPassword"),
    body("newPassword")
      .notEmpty()
      .withMessage("Please provide newPassword"),
  ];
};
