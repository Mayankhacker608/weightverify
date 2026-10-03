const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const morgan = require("morgan");
const rateLimit = require("express-rate-limit");
const cron = require("node-cron");
const dotenv = require("dotenv");
const mongoose = require("mongoose");
const { MongoMemoryServer } = require("mongodb-memory-server");
const multer = require("multer");
const path = require("path");

const frontendDir = path.join(__dirname, "../frontend");

const {
  processCertificateExpiries,
} = require("./services/certificateExpiryService");

// Load environment variables
dotenv.config({ path: path.join(__dirname, ".env") });
dotenv.config({ path: path.join(__dirname, "../.env") });

const app = express();

const PORT = process.env.PORT || 5000;

let memoryServer = null;
let databaseConnectionPromise = null;
let expiryJob = null;

/*
|--------------------------------------------------------------------------
| CORS
|--------------------------------------------------------------------------
| Frontend is currently served from the same Render domain:
| https://weightverify.onrender.com
|--------------------------------------------------------------------------
*/

const allowedOrigins = new Set([
  "http://localhost:5000",
  "http://127.0.0.1:5000",
  "https://weightverify.onrender.com",

  ...(process.env.FRONTEND_URL || "")
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean),
]);

app.disable("x-powered-by");

app.use(
  helmet({
    crossOriginResourcePolicy: false,
  }),
);

app.use(
  cors({
    origin: (origin, callback) => {
      const isLocalDevelopmentOrigin =
        process.env.NODE_ENV !== "production" &&
        /^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin || "");

      // Allow:
      // 1. Requests with no Origin (same-origin/server-side tools)
      // 2. Known origins
      // 3. Local development origins
      if (!origin || allowedOrigins.has(origin) || isLocalDevelopmentOrigin) {
        return callback(null, true);
      }

      return callback(new Error("Origin is not allowed by CORS."));
    },

    credentials: true,
  }),
);

/*
|--------------------------------------------------------------------------
| Body Parsers
|--------------------------------------------------------------------------
*/

app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

/*
|--------------------------------------------------------------------------
| Logging & Rate Limiting
|--------------------------------------------------------------------------
*/

app.use(morgan("dev"));

app.use(
  rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 200,
    standardHeaders: true,
    legacyHeaders: false,
  }),
);

/*
|--------------------------------------------------------------------------
| Static Frontend
|--------------------------------------------------------------------------
*/

app.use(express.static(frontendDir));

/*
|--------------------------------------------------------------------------
| Database Connection Middleware
|--------------------------------------------------------------------------
*/

app.use(async (req, res, next) => {
  try {
    await connectDatabase();
    next();
  } catch (error) {
    next(error);
  }
});

/*
|--------------------------------------------------------------------------
| Routes
|--------------------------------------------------------------------------
*/

const authRoutes = require("./routes/authRoutes");
const userRoutes = require("./routes/userRoutes");
const instrumentRoutes = require("./routes/instrumentRoutes");
const applicationRoutes = require("./routes/applicationRoutes");
const verificationRoutes = require("./routes/verificationRoutes");
const certificateRoutes = require("./routes/certificateRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const invitationRoutes = require("./routes/invitationRoutes");

/*
|--------------------------------------------------------------------------
| Health Check
|--------------------------------------------------------------------------
*/

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "e-metrology",
    environment: process.env.NODE_ENV || "development",
  });
});

/*
|--------------------------------------------------------------------------
| Frontend
|--------------------------------------------------------------------------
*/

app.get("/", (req, res) => {
  res.sendFile(path.join(frontendDir, "index.html"));
});

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
*/

app.use("/api/auth", authRoutes);
app.use("/api/users", userRoutes);
app.use("/api/instruments", instrumentRoutes);
app.use("/api/applications", applicationRoutes);
app.use("/api/verifications", verificationRoutes);
app.use("/api/certificates", certificateRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/invitations", invitationRoutes);

/*
|--------------------------------------------------------------------------
| Unknown API Route
|--------------------------------------------------------------------------
*/

app.use("/api", (req, res) => {
  res.status(404).json({
    message: "API endpoint not found.",
  });
});

/*
|--------------------------------------------------------------------------
| Global Error Handler
|--------------------------------------------------------------------------
*/

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);

  const status =
    err instanceof multer.MulterError
      ? err.code === "LIMIT_FILE_SIZE"
        ? 413
        : 400
      : err.statusCode || 500;

  res.status(status).json({
    message:
      err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
        ? "Uploaded file exceeds the 5 MB limit."
        : err instanceof multer.MulterError
          ? "Upload contains too many files or invalid file fields."
          : err.message || "Something went wrong",

    ...(process.env.NODE_ENV === "development" && {
      stack: err.stack,
    }),
  });
});

/*
|--------------------------------------------------------------------------
| MongoDB Connection
|--------------------------------------------------------------------------
*/

const connectDatabase = async () => {
  // Already connected
  if (mongoose.connection.readyState === 1) {
    return;
  }

  // Connection already in progress
  if (databaseConnectionPromise) {
    return databaseConnectionPromise;
  }

  databaseConnectionPromise = (async () => {
    let mongoUri =
      process.env.NODE_ENV === "test"
        ? null
        : process.env.MONGO_URI || process.env.MONGODB_URI;

    /*
    |--------------------------------------------------------------------------
    | Local fallback MongoDB
    |--------------------------------------------------------------------------
    */

    if (!mongoUri) {
      memoryServer = await MongoMemoryServer.create();
      mongoUri = memoryServer.getUri();

      console.log("Using in-memory MongoDB for local development");
    }

    await mongoose.connect(mongoUri);

    console.log("MongoDB connected");
  })().catch((error) => {
    databaseConnectionPromise = null;
    throw error;
  });

  return databaseConnectionPromise;
};

/*
|--------------------------------------------------------------------------
| Close Database
|--------------------------------------------------------------------------
*/

const closeDatabase = async () => {
  if (expiryJob) {
    expiryJob.stop();
    expiryJob = null;
  }

  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
  }

  if (memoryServer) {
    await memoryServer.stop();
    memoryServer = null;
  }
};

/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/

const startServer = async () => {
  try {
    await connectDatabase();

    /*
    |--------------------------------------------------------------------------
    | Certificate Expiry Processing
    |--------------------------------------------------------------------------
    */

    if (process.env.NODE_ENV !== "test") {
      await processCertificateExpiries().catch((error) => {
        console.error("Certificate expiry catch-up failed:", error.message);
      });

      expiryJob = cron.schedule(
        process.env.CERTIFICATE_EXPIRY_CRON || "0 8 * * *",

        () =>
          processCertificateExpiries().catch((error) => {
            console.error("Certificate expiry run failed:", error.message);
          }),

        {
          timezone: process.env.CERTIFICATE_EXPIRY_TIMEZONE || "UTC",
        },
      );
    }

    /*
    |--------------------------------------------------------------------------
    | HTTP Server
    |--------------------------------------------------------------------------
    */

    const server = app.listen(PORT, () => {
      console.log(`Server running on port ${PORT}`);
      console.log(`Frontend/API: https://weightverify.onrender.com`);
    });

    /*
    |--------------------------------------------------------------------------
    | Server Error
    |--------------------------------------------------------------------------
    */

    server.on("error", async (error) => {
      if (error.code === "EADDRINUSE") {
        console.error(
          `Port ${PORT} is already in use. Stop the existing server or set PORT to another value.`,
        );
      } else {
        console.error("Failed to start HTTP server:", error.message);
      }

      await closeDatabase();

      process.exitCode = 1;
    });
  } catch (error) {
    console.error("Failed to start server:", error.message);

    process.exit(1);
  }
};

/*
|--------------------------------------------------------------------------
| Start Only When Executed Directly
|--------------------------------------------------------------------------
*/

if (require.main === module) {
  startServer();
}

/*
|--------------------------------------------------------------------------
| Exports
|--------------------------------------------------------------------------
*/

module.exports = app;
module.exports.closeDatabase = closeDatabase;
