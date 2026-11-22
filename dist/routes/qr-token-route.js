"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.qRRoutes = void 0;
const express_1 = require("express");
const helpers_1 = require("../helpers");
const middleware_1 = require("../middleware");
const controllers_1 = require("../controllers");
const router = (0, express_1.Router)();
exports.qRRoutes = router;
router.use(middleware_1.currentUserMiddleware, middleware_1.requireAuthMiddleware);
router
    .route("/")
    .post(helpers_1.validateRequestMiddleware, controllers_1.generateQRTOkenController);
