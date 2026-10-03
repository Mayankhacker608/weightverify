const express = require("express");
const fs = require("fs");
const path = require("path");
const { body, validationResult } = require("express-validator");
const Instrument = require("../models/Instrument");
const { protect } = require("../middleware/auth");
const upload = require("../utils/upload");
const { validateUploadedFiles } = upload;
const { generateInstrumentId } = require("../utils/idGenerator");

const router = express.Router();
const uploadRoot = path.resolve(__dirname, "../uploads");

const safeInstrument = (instrument) => {
  const data = instrument.toObject();
  for (const files of [data.documents, data.photos]) {
    for (const file of files || []) delete file.path;
  }
  return data;
};

const requireInstrumentAccess = async (req, res, next) => {
  try {
    const instrument = await Instrument.findById(req.params.id);
    if (!instrument) {
      return res.status(404).json({ message: "Instrument not found." });
    }
    const isPrivileged = ["ADMIN", "SUPER_ADMIN"].includes(req.user.role);
    if (
      !isPrivileged &&
      instrument.ownerId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Unauthorized access." });
    }
    req.instrument = instrument;
    next();
  } catch (error) {
    next(error);
  }
};

router.post(
  "/",
  protect,
  [
    body("type").notEmpty(),
    body("category").notEmpty(),
    body("manufacturer").notEmpty(),
    body("model").notEmpty(),
    body("serialNumber").notEmpty(),
  ],
  async (req, res) => {
    const errors = validationResult(req);
    if (!errors.isEmpty())
      return res.status(400).json({ errors: errors.array() });

    try {
      const {
        type,
        category,
        manufacturer,
        model,
        serialNumber,
        capacity,
        accuracy,
        location,
        purchaseDate,
      } = req.body;
      const instrument = await Instrument.create({
        instrumentId: generateInstrumentId(),
        ownerId: req.user._id,
        type,
        category,
        manufacturer,
        model,
        serialNumber,
        capacity,
        accuracy,
        location,
        purchaseDate,
        currentStatus: "ACTIVE",
      });
      res.status(201).json({ instrument: safeInstrument(instrument) });
    } catch (error) {
      res.status(500).json({ message: "Failed to create instrument." });
    }
  },
);

router.get("/", protect, async (req, res) => {
  try {
    const filter =
      req.user.role === "ADMIN" || req.user.role === "SUPER_ADMIN"
        ? {}
        : { ownerId: req.user._id };
    const instruments = await Instrument.find(filter).sort({ createdAt: -1 });
    res.json({ instruments: instruments.map(safeInstrument) });
  } catch (error) {
    res.status(500).json({ message: "Failed to load instruments." });
  }
});

router.get("/:id", protect, async (req, res) => {
  try {
    const instrument = await Instrument.findById(req.params.id).populate(
      "ownerId",
      "name email organization",
    );
    if (!instrument)
      return res.status(404).json({ message: "Instrument not found." });
    if (
      req.user.role !== "ADMIN" &&
      req.user.role !== "SUPER_ADMIN" &&
      instrument.ownerId._id.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Unauthorized access." });
    }
    res.json({ instrument: safeInstrument(instrument) });
  } catch (error) {
    res.status(500).json({ message: "Failed to load instrument." });
  }
});

router.put("/:id", protect, async (req, res) => {
  try {
    const instrument = await Instrument.findById(req.params.id);
    if (!instrument)
      return res.status(404).json({ message: "Instrument not found." });
    if (
      req.user.role !== "ADMIN" &&
      req.user.role !== "SUPER_ADMIN" &&
      instrument.ownerId.toString() !== req.user._id.toString()
    ) {
      return res.status(403).json({ message: "Unauthorized access." });
    }

    const editableFields = [
      "type",
      "category",
      "manufacturer",
      "model",
      "serialNumber",
      "capacity",
      "accuracy",
      "location",
      "purchaseDate",
    ];
    editableFields.forEach((field) => {
      if (Object.hasOwn(req.body, field)) instrument[field] = req.body[field];
    });
    await instrument.save();
    res.json({ instrument: safeInstrument(instrument) });
  } catch (error) {
    res.status(500).json({ message: "Failed to update instrument." });
  }
});

router.post(
  "/:id/upload",
  protect,
  requireInstrumentAccess,
  upload.array("files", 5),
  validateUploadedFiles,
  async (req, res) => {
    try {
      const instrument = req.instrument;
      const photoType = [
        "FRONT",
        "BACK",
        "SIDE",
        "SERIAL_PLATE",
        "LOCATION",
        "ADDITIONAL",
      ].includes(req.body.photoType)
        ? req.body.photoType
        : "ADDITIONAL";
      const files = (req.files || []).map((file) => ({
        name: path.basename(file.originalname),
        path: file.path,
        mimeType: file.mimetype,
        documentType: file.mimetype.startsWith("image/")
          ? photoType
          : "SUPPORTING_DOCUMENT",
        uploadedBy: req.user._id,
        uploadedAt: new Date(),
      }));

      const storedFiles = files.map((file) => {
        const collection =
          file.mimeType === "application/pdf"
            ? instrument.documents
            : instrument.photos;
        collection.push(file);
        const storedFile = collection[collection.length - 1];
        return {
          id: storedFile._id,
          name: storedFile.name,
          mimeType: storedFile.mimeType,
          documentType: storedFile.documentType,
          uploadedAt: storedFile.uploadedAt,
        };
      });
      await instrument.save();
      res.status(200).json({
        message: "Documents uploaded successfully.",
        files: storedFiles,
      });
    } catch (error) {
      res.status(500).json({ message: "File upload failed." });
    }
  },
);

router.get(
  "/:id/files/:fileId",
  protect,
  requireInstrumentAccess,
  async (req, res, next) => {
    try {
      const file = [...req.instrument.documents, ...req.instrument.photos].find(
        (item) => item._id.toString() === req.params.fileId,
      );
      if (!file) {
        return res.status(404).json({ message: "Instrument file not found." });
      }
      const filePath = path.resolve(file.path);
      if (!filePath.startsWith(`${uploadRoot}${path.sep}`)) {
        return res
          .status(400)
          .json({ message: "Invalid instrument file reference." });
      }
      if (!fs.existsSync(filePath)) {
        return res
          .status(404)
          .json({ message: "Instrument file is unavailable." });
      }
      res
        .type(file.mimeType)
        .sendFile(filePath, { dotfiles: "deny" }, (error) => {
          if (error) next(error);
        });
    } catch (error) {
      next(error);
    }
  },
);

module.exports = router;
