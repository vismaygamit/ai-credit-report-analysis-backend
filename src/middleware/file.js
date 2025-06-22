import multer from "multer";
import fs from "fs";

const MIME_TYPES = {
  "application/pdf": "pdf",
};

const storage = multer.diskStorage({
  destination: (req, file, callback) => {
    // const uploadDir = "uploads/";
    const uploadDir = "tmp/";
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    callback(null, uploadDir);
  },
  filename: (req, file, callback) => {
    const name = file.originalname.replace(/\.[^/.]+$/, "");
    const extension = MIME_TYPES[file.mimetype];
    callback(null, name + Date.now() + "." + extension);
  },
});

const fileFilter = (req, file, callback) => {
    if (file.mimetype === "application/pdf") {
        callback(null, true);
    } else {
        // req.fileValidationError = "Only PDF files are allowed!";
        callback(new Error('Only PDF files are allowed'), false);
    }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // Limit file size to 10MB
  fileFilter: fileFilter,
}); // Use single file upload with field name 'file'

export default upload;
