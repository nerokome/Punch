"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.deleteUpload = void 0;
const fs_1 = require("fs");
const deleteUpload = (upload_url, next) => {
    (0, fs_1.unlink)(upload_url, (err) => {
        if (err)
            next(err);
    });
};
exports.deleteUpload = deleteUpload;
// export const deleteUpload = (upload_url: string, next: NextFunction) => {
//   const filePath = path.resolve(upload_url);
//   console.log(`Deleting file at: ${filePath}`);
//   access(filePath, constants.F_OK, (accessErr) => {
//     if (accessErr) {
//       console.error(`File does not exist: ${filePath}`);
//       next(accessErr);
//       return;
//     }
//     unlink(filePath, (unlinkErr) => {
//       if (unlinkErr) {
//         console.error(`Error deleting file: ${unlinkErr.message}`);
//         next(unlinkErr);
//       } else {
//         console.log(`File deleted successfully: ${filePath}`);
//       }
//     });
//   });
// };
