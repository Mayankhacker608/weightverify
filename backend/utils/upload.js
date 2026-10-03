const multer = require("multer");
const crypto = require("crypto");
const path = require("path");
const fs = require("fs");

const uploadDir = path.join(__dirname, "../uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadDir),
  filename: (req, file, cb) => {
    const safeName = `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`;
    cb(null, safeName);
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = {
    "image/jpeg": [".jpg", ".jpeg"],
    "image/png": [".png"],
    "application/pdf": [".pdf"],
  };
  const ext = path.extname(file.originalname).toLowerCase();

  if (!allowed[file.mimetype]?.includes(ext)) {
    const error = new Error("File type is not supported.");
    error.statusCode = 400;
    return cb(error);
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

const matchesSignature = async (file) => {
  const handle = await fs.promises.open(file.path, "r");
  try {
    const header = Buffer.alloc(8);
    const { bytesRead } = await handle.read(header, 0, header.length, 0);
    const signature = header.subarray(0, bytesRead);
    if (file.mimetype === "image/jpeg") {
      return (
        signature.length >= 3 &&
        signature[0] === 0xff &&
        signature[1] === 0xd8 &&
        signature[2] === 0xff
      );
    }
    if (file.mimetype === "image/png") {
      return signature.equals(
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      );
    }
    return signature.subarray(0, 5).toString("ascii") === "%PDF-";
  } finally {
    await handle.close();
  }
};

const validateUploadedFiles = async (req, res, next) => {
  const files = req.files || [];
  try {
    for (const file of files) {
      if (!(await matchesSignature(file))) {
        await Promise.all(
          files.map((uploadedFile) =>
            fs.promises.unlink(uploadedFile.path).catch(() => {}),
          ),
        );
        return res.status(400).json({
          message: "Uploaded file content does not match its declared type.",
        });
      }
    }
    next();
  } catch (error) {
    await Promise.all(
      files.map((file) => fs.promises.unlink(file.path).catch(() => {})),
    );
    next(error);
  }
};

module.exports = upload;
module.exports.validateUploadedFiles = validateUploadedFiles;
