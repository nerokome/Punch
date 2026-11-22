"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Password = void 0;
const bcrypt_1 = __importDefault(require("bcrypt"));
class Password {
    static async toHash(password) {
        const saltWorkFactor = parseInt(process.env.SALT_WORK_FACTOR);
        const salt = await bcrypt_1.default.genSalt(saltWorkFactor);
        return await bcrypt_1.default.hash(password, salt);
    }
    static async comparePassword(password, hashedPassword) {
        return await bcrypt_1.default.compare(password, hashedPassword);
    }
}
exports.Password = Password;
