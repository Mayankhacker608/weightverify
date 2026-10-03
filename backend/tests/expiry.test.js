const mongoose = require("mongoose");
const request = require("supertest");
const app = require("../server");
const User = require("../models/User");
const Certificate = require("../models/Certificate");
const Notification = require("../models/Notification");
const {
  processCertificateExpiries,
} = require("../services/certificateExpiryService");
const { closeDatabase } = require("../server");

jest.setTimeout(60000);

describe("certificate expiry processing", () => {
  let ownerId;

  beforeAll(async () => {
    await request(app).get("/health");
    const owner = await User.create({
      name: "Expiry Test Owner",
      email: "expiry-owner@example.com",
      phone: "9000000401",
      passwordHash: "test-hash",
      role: "USER",
      status: "ACTIVE",
    });
    ownerId = owner._id;
  });

  it("marks certificates and sends each expiry notification once", async () => {
    const now = new Date("2030-06-15T12:00:00.000Z");
    const makeCertificate = (suffix, validUntil) => ({
      certificateNumber: `EXP-${Date.now()}-${suffix}`,
      applicationId: new mongoose.Types.ObjectId(),
      instrumentId: new mongoose.Types.ObjectId(),
      ownerId,
      verificationId: new mongoose.Types.ObjectId(),
      validUntil,
      qrToken: `${Date.now()}-${suffix}`,
      createdBy: ownerId,
      status: "VALID",
    });
    const expiring = await Certificate.create(
      makeCertificate("SOON", new Date(now.getTime() + 10 * 86400000)),
    );
    const expired = await Certificate.create(
      makeCertificate("OLD", new Date(now.getTime() - 86400000)),
    );

    const firstRun = await processCertificateExpiries(now);
    expect(firstRun).toEqual({ expiringSoon: 1, expired: 1 });
    expect((await Certificate.findById(expiring._id)).status).toBe(
      "EXPIRING_SOON",
    );
    expect((await Certificate.findById(expired._id)).status).toBe("EXPIRED");

    const secondRun = await processCertificateExpiries(now);
    expect(secondRun).toEqual({ expiringSoon: 0, expired: 0 });
    const notifications = await Notification.find({ userId: ownerId });
    expect(notifications).toHaveLength(2);
    expect(
      notifications.map((notification) => notification.type).sort(),
    ).toEqual(["CERTIFICATE_EXPIRED", "CERTIFICATE_EXPIRING_SOON"]);
  });

  afterAll(async () => {
    await closeDatabase();
  });
});
