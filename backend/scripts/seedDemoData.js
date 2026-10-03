const bcrypt = require("bcryptjs");
const mongoose = require("mongoose");
const dotenv = require("dotenv");
const path = require("path");
const User = require("../models/User");
const Instrument = require("../models/Instrument");
const VerificationApplication = require("../models/VerificationApplication");
const Verification = require("../models/Verification");
const Certificate = require("../models/Certificate");
const { MongoMemoryServer } = require("mongodb-memory-server");
const {
  generateInstrumentId,
  generateApplicationId,
  generateCertificateNumber,
  generateQrToken,
} = require("../utils/idGenerator");

dotenv.config({ path: path.join(__dirname, "../.env") });
dotenv.config({ path: path.join(__dirname, "../../.env") });

const seedData = async () => {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.DEMO_SEED_CONFIRM !== "I_UNDERSTAND_THIS_RESETS_LOCAL_DEMO_DATA"
  ) {
    throw new Error(
      "Demo seeding is disabled. Set DEMO_SEED_CONFIRM=I_UNDERSTAND_THIS_RESETS_LOCAL_DEMO_DATA only for a disposable local demo database.",
    );
  }
  let mongoUri = process.env.MONGO_URI || process.env.MONGODB_URI;
  if (mongoUri) {
    const parsedUri = new URL(mongoUri);
    const localHost = ["localhost", "127.0.0.1", "::1"].includes(
      parsedUri.hostname,
    );
    const safeDatabase = /demo|test/i.test(parsedUri.pathname);
    if (!localHost || !safeDatabase) {
      throw new Error(
        "Refusing to seed: only local MongoDB databases with demo or test in the database name are allowed.",
      );
    }
  }
  const demoPasswords = [
    "DEMO_ADMIN_PASSWORD",
    "DEMO_LMO_PASSWORD",
    "DEMO_GATC_PASSWORD",
    "DEMO_USER_PASSWORD",
  ];
  const missingPasswords = demoPasswords.filter(
    (variable) => (process.env[variable] || "").length < 12,
  );
  if (missingPasswords.length) {
    throw new Error(
      `Set unique local-only passwords of at least 12 characters for: ${missingPasswords.join(", ")}.`,
    );
  }
  if (!mongoUri) {
    const memoryServer = await MongoMemoryServer.create();
    mongoUri = memoryServer.getUri();
  }
  await mongoose.connect(mongoUri);

  await User.deleteMany({});
  await Instrument.deleteMany({});
  await VerificationApplication.deleteMany({});
  await Verification.deleteMany({});
  await Certificate.deleteMany({});

  const adminPassword = await bcrypt.hash(process.env.DEMO_ADMIN_PASSWORD, 12);
  const lmoPassword = await bcrypt.hash(process.env.DEMO_LMO_PASSWORD, 12);
  const gatcPassword = await bcrypt.hash(process.env.DEMO_GATC_PASSWORD, 12);
  const userPassword = await bcrypt.hash(process.env.DEMO_USER_PASSWORD, 12);

  const admin = await User.create({
    name: "System Admin",
    email: "admin@demo.local",
    phone: "9000000001",
    passwordHash: adminPassword,
    role: "ADMIN",
    organization: "State Metrology Department",
    address: "Administration Block",
    state: "Karnataka",
    district: "Bengaluru",
  });

  const lmo = await User.create({
    name: "LMO Officer",
    email: "lmo@demo.local",
    phone: "9000000002",
    passwordHash: lmoPassword,
    role: "LMO",
    organization: "Regional Weights Lab",
    address: "Lab Road",
    state: "Karnataka",
    district: "Mysuru",
  });

  const gatc = await User.create({
    name: "GATC Officer",
    email: "gatc@demo.local",
    phone: "9000000003",
    passwordHash: gatcPassword,
    role: "GATC",
    organization: "GATC Unit",
    address: "Central Testing Center",
    state: "Karnataka",
    district: "Bengaluru",
  });

  const user = await User.create({
    name: "Demo User",
    email: "user@demo.local",
    phone: "9000000004",
    passwordHash: userPassword,
    role: "USER",
    organization: "Demo Business",
    address: "Market Street",
    state: "Karnataka",
    district: "Bengaluru",
  });

  const instrument = await Instrument.create({
    instrumentId: generateInstrumentId(),
    ownerId: user._id,
    type: "Electronic Weighing Machine",
    category: "Weight",
    manufacturer: "Mettler",
    model: "M-200",
    serialNumber: "ABC12345",
    capacity: "200 kg",
    accuracy: "0.01 kg",
    location: "Bengaluru",
    purchaseDate: new Date("2024-01-15"),
    currentStatus: "ACTIVE",
  });

  const application = await VerificationApplication.create({
    applicationId: generateApplicationId(),
    applicantId: user._id,
    instrumentId: instrument._id,
    applicationType: "Initial Verification",
    preferredDate: new Date(),
    status: "APPROVED_FOR_SCHEDULING",
    assignedOfficer: lmo._id,
    assignedGATC: gatc._id,
    scheduledDate: new Date(),
    scheduleLocation: "Bengaluru Office",
  });

  const verification = await Verification.create({
    applicationId: application._id,
    verifierId: lmo._id,
    checklist: {
      instrumentPhysicallyAvailable: true,
      identificationVerified: true,
      serialNumberChecked: true,
      sealChecked: true,
      physicalCondition: "PASS",
      displayIndication: "PASS",
      accuracy: "PASS",
      otherRequiredChecks: "PASS",
    },
    measurements: {
      observedMeasurement: 100,
      standardMeasurement: 100,
      error: 0,
      permissibleError: 0.05,
    },
    observations:
      "Instrument functioning within tolerance and no discrepancies observed.",
    remarks: "Approved for continued operation.",
    result: "PASS",
    verifiedAt: new Date(),
  });

  const certificate = await Certificate.create({
    certificateNumber: generateCertificateNumber(),
    applicationId: application._id,
    instrumentId: instrument._id,
    ownerId: user._id,
    verificationId: verification._id,
    validUntil: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
    qrToken: generateQrToken(),
    createdBy: admin._id,
    status: "VALID",
  });

  console.log("Demo accounts seeded successfully.");
  console.log(
    "Demo accounts created; use the local-only passwords configured in the environment.",
  );
  console.log("Certificate: " + certificate.certificateNumber);
  process.exit(0);
};

seedData().catch((err) => {
  console.error("Seeding failed:", err);
  process.exit(1);
});
