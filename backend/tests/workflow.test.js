const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../server");
const { closeDatabase } = require("../server");
const User = require("../models/User");

jest.setTimeout(60000);
process.env.TEST_ADMIN_ACCESS_KEY = "WorkflowAdminAccessKey@123";
process.env.ADMIN_ACCESS_KEY_HASH = bcrypt.hashSync(
  process.env.TEST_ADMIN_ACCESS_KEY,
  10,
);

const baseUser = {
  name: "Workflow User",
  email: "workflow-user@example.com",
  phone: "8888888888",
  password: "Pass@123",
  organization: "Demo Business",
  address: "Main Road",
  state: "Karnataka",
  district: "Bengaluru",
  role: "USER",
};

const adminUser = {
  name: "Workflow Admin",
  email: "workflow-admin@example.com",
  phone: "7777777777",
  password: "Pass@123",
  organization: "Metrology Dept",
  address: "Admin Road",
  state: "Karnataka",
  district: "Bengaluru",
  role: "ADMIN",
};

const lmoUser = {
  name: "Workflow LMO",
  email: "workflow-lmo@example.com",
  phone: "6666666666",
  password: "Pass@123",
  organization: "LMO Office",
  address: "LMO Road",
  state: "Karnataka",
  district: "Mysuru",
  role: "LMO",
};

const provisionTrustedUser = async ({ password, ...userData }) => {
  const user = await User.create({
    ...userData,
    passwordHash: await bcrypt.hash(password, 10),
    status: "ACTIVE",
  });
  const loginRes = await request(app)
    .post("/api/auth/login")
    .send({
      email: user.email,
      password,
      ...(userData.role === "ADMIN"
        ? { adminAccessKey: process.env.TEST_ADMIN_ACCESS_KEY }
        : {}),
    });
  expect(loginRes.statusCode).toBe(200);
  return { user, token: loginRes.body.token };
};

let userToken;
let adminToken;
let lmoToken;
let gatcToken;
let userId;
let instrumentId;
let applicationId;
let certificateNumber;

describe("e-Metrology workflow", () => {
  test("registers user, creates instrument, schedules and verifies a certificate", async () => {
    const userRes = await request(app)
      .post("/api/auth/register")
      .send(baseUser);
    expect(userRes.statusCode).toBe(201);
    userToken = userRes.body.token;
    userId = userRes.body.user._id;

    const admin = await provisionTrustedUser(adminUser);
    adminToken = admin.token;

    const lmo = await provisionTrustedUser(lmoUser);
    lmoToken = lmo.token;
    const gatc = await provisionTrustedUser({
      name: "Workflow GATC",
      email: "workflow-gatc@example.com",
      phone: "5555555555",
      password: "Pass@123",
      organization: "Test Calibration Center",
      address: "Lab Road",
      state: "Karnataka",
      district: "Bengaluru",
      role: "GATC",
    });
    gatcToken = gatc.token;

    const instrumentRes = await request(app)
      .post("/api/instruments")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        type: "Digital Weighing Scale",
        category: "Weight",
        manufacturer: "Test Mfg",
        model: "WM-100",
        serialNumber: "SERIAL-1001",
        capacity: "100 kg",
        accuracy: "0.01 kg",
        location: "Bengaluru",
        ownerId: admin.user._id,
        currentStatus: "INACTIVE",
      });

    expect(instrumentRes.statusCode).toBe(201);
    expect(instrumentRes.body.instrument.ownerId).toBe(userId);
    expect(instrumentRes.body.instrument.currentStatus).toBe("ACTIVE");
    instrumentId = instrumentRes.body.instrument._id;

    const spoofedUpload = await request(app)
      .post(`/api/instruments/${instrumentId}/upload`)
      .set("Authorization", `Bearer ${userToken}`)
      .attach("files", Buffer.from("not a png"), {
        filename: "instrument.png",
        contentType: "image/png",
      });
    expect(spoofedUpload.statusCode).toBe(400);
    expect(spoofedUpload.body.message).toBe(
      "Uploaded file content does not match its declared type.",
    );

    const validDocumentUpload = await request(app)
      .post(`/api/instruments/${instrumentId}/upload`)
      .set("Authorization", `Bearer ${userToken}`)
      .field("photoType", "SERIAL_PLATE")
      .attach("files", Buffer.from("%PDF-1.4\nTest instrument document"), {
        filename: "instrument-record.pdf",
        contentType: "application/pdf",
      });
    expect(validDocumentUpload.statusCode).toBe(200);
    expect(validDocumentUpload.body.files[0].documentType).toBe(
      "SUPPORTING_DOCUMENT",
    );
    expect(validDocumentUpload.body.files[0].path).toBeUndefined();

    const downloadedFile = await request(app)
      .get(
        `/api/instruments/${instrumentId}/files/${validDocumentUpload.body.files[0].id}`,
      )
      .set("Authorization", `Bearer ${userToken}`);
    expect(downloadedFile.statusCode).toBe(200);
    expect(downloadedFile.headers["content-type"]).toContain("application/pdf");

    const appRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        instrumentId,
        applicationType: "Initial Verification",
        preferredDate: new Date().toISOString(),
        remarks: "Routine verification request",
      });

    expect(appRes.statusCode).toBe(201);
    applicationId = appRes.body.application._id;

    const unauthorizedStatusChange = await request(app)
      .put(`/api/applications/${applicationId}`)
      .set("Authorization", `Bearer ${userToken}`)
      .send({ status: "VERIFIED" });
    expect(unauthorizedStatusChange.statusCode).toBe(403);

    const prematureSchedule = await request(app)
      .post(`/api/applications/${applicationId}/schedule`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        officerId: lmo.user._id,
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        scheduleLocation: "Field Office Bengaluru",
      });
    expect(prematureSchedule.statusCode).toBe(409);

    const reviewRes = await request(app)
      .put(`/api/applications/${applicationId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "UNDER_REVIEW" });
    expect(reviewRes.statusCode).toBe(200);
    const approvalRes = await request(app)
      .put(`/api/applications/${applicationId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "APPROVED_FOR_SCHEDULING" });
    expect(approvalRes.statusCode).toBe(200);

    const scheduleRes = await request(app)
      .post(`/api/applications/${applicationId}/schedule`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        officerId: lmo.user._id,
        gatcId: gatc.user._id,
        scheduledDate: new Date(Date.now() + 86400000).toISOString(),
        scheduleLocation: "Field Office Bengaluru",
        remarks: "Assigned for inspection",
      });

    expect(scheduleRes.statusCode).toBe(200);
    expect(scheduleRes.body.application.status).toBe("SCHEDULED");

    const evidenceUpload = await request(app)
      .post(`/api/applications/${applicationId}/evidence`)
      .set("Authorization", `Bearer ${lmoToken}`)
      .field("documentType", "SERIAL_PLATE")
      .attach(
        "files",
        Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
        { filename: "serial-plate.png", contentType: "image/png" },
      );
    expect(evidenceUpload.statusCode).toBe(201);
    expect(evidenceUpload.body.evidence[0].path).toBeUndefined();

    const evidenceDownload = await request(app)
      .get(
        `/api/applications/${applicationId}/evidence/${evidenceUpload.body.evidence[0].id}`,
      )
      .set("Authorization", `Bearer ${userToken}`);
    expect(evidenceDownload.statusCode).toBe(200);
    expect(evidenceDownload.headers["content-type"]).toContain("image/png");

    const unauthorizedVerification = await request(app)
      .post("/api/verifications")
      .set("Authorization", `Bearer ${userToken}`)
      .send({ applicationId, result: "PASS" });
    expect(unauthorizedVerification.statusCode).toBe(403);

    const verificationRes = await request(app)
      .post("/api/verifications")
      .set("Authorization", `Bearer ${lmoToken}`)
      .send({
        applicationId,
        result: "PASS",
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
          observedMeasurement: 50,
          standardMeasurement: 50,
          error: 0,
          permissibleError: 0.05,
        },
        observations: "Within tolerance and compliant.",
        remarks: "Approved for certificate issuance.",
      });

    expect(verificationRes.statusCode).toBe(201);
    expect(verificationRes.body.application.status).toBe("GATC_REVIEW");

    const gatcVerificationRes = await request(app)
      .post("/api/verifications")
      .set("Authorization", `Bearer ${gatcToken}`)
      .send({
        applicationId,
        result: "PASS",
        observations: "Technical review completed.",
        remarks: "Within approved scope.",
      });
    expect(gatcVerificationRes.statusCode).toBe(201);
    expect(gatcVerificationRes.body.application.status).toBe("FINAL_REVIEW");

    const unauthorizedCertificate = await request(app)
      .post("/api/verifications/generate-certificate")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        applicationId,
        verificationId: verificationRes.body.verification._id,
      });
    expect(unauthorizedCertificate.statusCode).toBe(403);

    const prematureCertificate = await request(app)
      .post("/api/verifications/generate-certificate")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        applicationId,
        verificationId: gatcVerificationRes.body.verification._id,
      });
    expect(prematureCertificate.statusCode).toBe(409);

    const finalApproval = await request(app)
      .put(`/api/applications/${applicationId}`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ status: "APPROVED" });
    expect(finalApproval.statusCode).toBe(200);

    const certRes = await request(app)
      .post("/api/verifications/generate-certificate")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        applicationId,
        verificationId: gatcVerificationRes.body.verification._id,
      });

    expect(certRes.statusCode).toBe(201);
    certificateNumber = certRes.body.certificate.certificateNumber;

    const certificateList = await request(app)
      .get("/api/certificates")
      .set("Authorization", `Bearer ${userToken}`);
    expect(certificateList.statusCode).toBe(200);
    expect(certificateList.body.certificates[0].qrToken).toBeUndefined();
    expect(certificateList.body.certificates[0].pdfPath).toBeUndefined();

    const certificatePdf = await request(app)
      .get(`/api/certificates/${certRes.body.certificate._id}/pdf`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(certificatePdf.statusCode).toBe(200);
    expect(certificatePdf.headers["content-type"]).toContain("application/pdf");
    expect(certificatePdf.body.subarray(0, 5).toString()).toBe("%PDF-");

    const certificateQr = await request(app)
      .get(`/api/certificates/${certRes.body.certificate._id}/qr`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(certificateQr.statusCode).toBe(200);
    expect(certificateQr.headers["content-type"]).toContain("image/png");

    const publicVerify = await request(app).get(
      `/api/certificates/verify/${certificateNumber}`,
    );

    expect(publicVerify.statusCode).toBe(200);
    expect(publicVerify.body.status).toBe("VALID");
    expect(publicVerify.body.certificate.qrToken).toBeUndefined();
    expect(publicVerify.body.certificate.ownerId.phone).toBeUndefined();

    const reVerificationRes = await request(app)
      .post("/api/applications")
      .set("Authorization", `Bearer ${userToken}`)
      .send({
        instrumentId,
        applicationType: "Re-Verification",
        remarks: "Renew the existing certificate.",
      });
    expect(reVerificationRes.statusCode).toBe(201);
    expect(reVerificationRes.body.application.previousCertificateId).toBe(
      certRes.body.certificate._id,
    );
    expect(
      await request(app)
        .get("/api/certificates")
        .set("Authorization", `Bearer ${userToken}`)
        .then((response) => response.body.certificates),
    ).toHaveLength(1);

    const notifications = await request(app)
      .get("/api/notifications")
      .set("Authorization", `Bearer ${userToken}`);
    expect(notifications.statusCode).toBe(200);
    expect(notifications.body.unreadCount).toBeGreaterThan(0);
    expect(
      notifications.body.notifications.some(
        (item) => item.type === "SCHEDULED",
      ),
    ).toBe(true);
    const notificationId = notifications.body.notifications[0]._id;
    const markedRead = await request(app)
      .put(`/api/notifications/${notificationId}/read`)
      .set("Authorization", `Bearer ${userToken}`);
    expect(markedRead.statusCode).toBe(200);
    expect(markedRead.body.notification.read).toBe(true);

    const missingRevocationReason = await request(app)
      .post(`/api/certificates/${certRes.body.certificate._id}/revoke`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({});
    expect(missingRevocationReason.statusCode).toBe(400);
    const revoked = await request(app)
      .post(`/api/certificates/${certRes.body.certificate._id}/revoke`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ reason: "Test revocation workflow." });
    expect(revoked.statusCode).toBe(200);
    const revokedPublicVerify = await request(app).get(
      `/api/certificates/verify/${certificateNumber}`,
    );
    expect(revokedPublicVerify.body.status).toBe("REVOKED");
  });

  afterAll(async () => {
    await closeDatabase();
  });
});
