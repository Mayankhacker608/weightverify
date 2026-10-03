const bcrypt = require("bcryptjs");
const request = require("supertest");
const app = require("../server");
const User = require("../models/User");
const InvitationKey = require("../models/InvitationKey");
const { closeDatabase } = require("../server");

jest.setTimeout(60000);

describe("staff invitation onboarding", () => {
  let adminToken;
  let invitationKey;
  let invitationId;
  let staffId;
  const staffEmail = "invited-lmo@example.com";
  const staffPassword = "InvitedStaff@123";

  beforeAll(async () => {
    const adminAccessKey = "InvitationAdminAccessKey@123";
    process.env.ADMIN_ACCESS_KEY_HASH = await bcrypt.hash(adminAccessKey, 10);
    const health = await request(app).get("/health");
    expect(health.statusCode).toBe(200);
    await User.create({
      name: "Invitation Test Admin",
      email: "invitation-admin@example.com",
      phone: "9000000101",
      passwordHash: await bcrypt.hash("AdminTest@123", 10),
      role: "ADMIN",
      status: "ACTIVE",
    });
    const login = await request(app).post("/api/auth/login").send({
      email: "invitation-admin@example.com",
      password: "AdminTest@123",
      adminAccessKey,
    });
    adminToken = login.body.token;
  });

  it("creates, consumes, reviews, and activates a scoped one-time LMO invitation", async () => {
    const createResponse = await request(app)
      .post("/api/invitations")
      .set("Authorization", `Bearer ${adminToken}`)
      .send({
        role: "LMO",
        organization: "Rewari Metrology Office",
        state: "Haryana",
        district: "Rewari",
      });

    expect(createResponse.statusCode).toBe(201);
    invitationKey = createResponse.body.invitationKey;
    invitationId = createResponse.body.invitation.id;
    expect(invitationKey).toHaveLength(43);

    const storedInvitation =
      await InvitationKey.findById(invitationId).select("+keyHash");
    expect(storedInvitation.keyHash).not.toBe(invitationKey);
    expect(storedInvitation.role).toBe("LMO");

    const basePayload = {
      invitationKey,
      role: "LMO",
      name: "Invited LMO",
      email: staffEmail,
      phone: "9000000102",
      password: staffPassword,
      organization: "Rewari Metrology Office",
      address: "Office Road",
      state: "Haryana",
      district: "Rewari",
      designation: "Legal Metrology Officer",
      employeeId: "EMP-TEST-01",
    };

    const wrongRoleResponse = await request(app)
      .post("/api/auth/staff-register")
      .send({ ...basePayload, role: "GATC", authorizationNumber: "AUTH-TEST" });
    expect(wrongRoleResponse.statusCode).toBe(403);

    const staffResponse = await request(app)
      .post("/api/auth/staff-register")
      .send(basePayload);
    expect(staffResponse.statusCode).toBe(201);
    expect(staffResponse.body.user.role).toBe("LMO");
    expect(staffResponse.body.user.status).toBe("PENDING");
    expect(staffResponse.body.token).toBeUndefined();
    staffId = staffResponse.body.user._id;
    const uploadToken = staffResponse.body.uploadToken;

    const operationalAccess = await request(app)
      .get("/api/instruments")
      .set("Authorization", `Bearer ${uploadToken}`);
    expect(operationalAccess.statusCode).toBe(403);

    const pdfDocument = Buffer.from("%PDF-1.4\nTest onboarding document");
    const appointmentUpload = await request(app)
      .post("/api/users/me/staff-documents")
      .set("Authorization", `Bearer ${uploadToken}`)
      .field("documentType", "appointment")
      .attach("files", pdfDocument, {
        filename: "appointment.pdf",
        contentType: "application/pdf",
      });
    expect(appointmentUpload.statusCode).toBe(201);
    expect(appointmentUpload.body.documents[0].path).toBeUndefined();

    const officialIdUpload = await request(app)
      .post("/api/users/me/staff-documents")
      .set("Authorization", `Bearer ${uploadToken}`)
      .field("documentType", "official_id")
      .attach("files", pdfDocument, {
        filename: "official-id.pdf",
        contentType: "application/pdf",
      });
    expect(officialIdUpload.statusCode).toBe(201);

    const pendingLogin = await request(app).post("/api/auth/login").send({
      email: staffEmail,
      password: staffPassword,
    });
    expect(pendingLogin.statusCode).toBe(200);
    expect(pendingLogin.body.pending).toBe(true);
    expect(pendingLogin.body.uploadToken).toBeDefined();
    expect(pendingLogin.body.token).toBeUndefined();

    const keyReuse = await request(app)
      .post("/api/auth/staff-register")
      .send({ ...basePayload, email: "invited-lmo-copy@example.com" });
    expect(keyReuse.statusCode).toBe(403);

    const pendingList = await request(app)
      .get("/api/users/staff/pending")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(pendingList.statusCode).toBe(200);
    expect(pendingList.body.users.map((user) => user._id)).toContain(staffId);

    const approved = await request(app)
      .post(`/api/users/${staffId}/review-staff`)
      .set("Authorization", `Bearer ${adminToken}`)
      .send({ decision: "VERIFIED" });
    expect(approved.statusCode).toBe(200);
    expect(approved.body.user.status).toBe("ACTIVE");
    expect(approved.body.user.staffProfile.verificationStatus).toBe("VERIFIED");

    const activeLogin = await request(app).post("/api/auth/login").send({
      email: staffEmail,
      password: staffPassword,
    });
    expect(activeLogin.statusCode).toBe(200);

    const staffDirectoryDenied = await request(app)
      .get("/api/users/authorized-staff?role=LMO")
      .set("Authorization", `Bearer ${activeLogin.body.token}`);
    expect(staffDirectoryDenied.statusCode).toBe(403);

    const staffDirectory = await request(app)
      .get("/api/users/authorized-staff?role=LMO&state=Haryana&district=Rewari")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(staffDirectory.statusCode).toBe(200);
    expect(staffDirectory.body.staff.map((user) => user._id)).toEqual([
      staffId,
    ]);
    expect(staffDirectory.body.staff[0].workload).toBe(0);

    const keyList = await request(app)
      .get("/api/invitations")
      .set("Authorization", `Bearer ${adminToken}`);
    expect(keyList.statusCode).toBe(200);
    expect(keyList.body.invitations[0].status).toBe("USED");
    expect(JSON.stringify(keyList.body)).not.toContain(invitationKey);
  });

  afterAll(async () => {
    await closeDatabase();
  });
});
