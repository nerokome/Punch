"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.absoluteAssetUrl = void 0;
const absoluteAssetUrl = (req, path) => {
    const baseUrl = process.env.BACKEND_BASE_URL?.replace(/\/+$/, "")
        || `${req.protocol}://${req.get("host")}`;
    return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
};
exports.absoluteAssetUrl = absoluteAssetUrl;
