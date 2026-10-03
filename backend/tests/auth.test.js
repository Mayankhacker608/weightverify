const request = require("supertest");
const bcrypt = require("bcryptjs");
const app = require("../server");
const { closeDatabase } = require("../server");
const User = require("../models/User");

jest.setTimeout(60000);

describe("Authentication APIs", () => {
  it("registers a new user", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Test User",
      email: "testuser@example.com",
      phone: "9876543210",
      password: "Pass@123",
      organization: "Demo Org",
      address: "Test Road",
      state: "Karnataka",
      district: "Bengaluru",
      role: "USER",
    });

    expect(response.statusCode).toBe(201);
    expect(response.body.user.email).toBe("testuser@example.com");
  });

  it("reports duplicate emails regardless of capitalization", async () => {
    const response = await request(app).post("/api/auth/register").send({
      name: "Duplicate User",
      email: "TESTUSER@EXAMPLE.COM",
      phone: "9876543211",
      password: "Pass@123",
      organization: "Demo Org",
      address: "Test Road",
      state: "Karnataka",
      district: "Bengaluru",
      role: "USER",
    });

    expect(response.statusCode).toBe(409);
    expect(response.body.message).toBe("Email already registered.");
  });

  it.each(["LMO", "GATC", "ADMIN", "SUPER_ADMIN"])(
    "does not allow public registration as %s",
    async (role) => {
      const response = await request(app)
        .post("/api/auth/register")
        .send({
          name: "Public Role Attempt",
          email: `public-${role.toLowerCase()}@example.com`,
          phone: "9000000099",
          password: "Pass@123",
          organization: "Untrusted Organization",
          address: "Test Road",
          state: "Karnataka",
          district: "Bengaluru",
          role,
        });

      expect(response.statusCode).toBe(400);
      expect(response.body.errors[0].msg).toBe(
        "Public registration is only available for USER accounts.",
      );
    },
  );

  it("allows a localhost frontend preview origin", async () => {
    const response = await request(app)
      .get("/health")
      .set("Origin", "https://weightverify.onrender.com");

    expect(response.statusCode).toBe(200);
    expect(response.headers["access-control-allow-origin"]).toBe(
      "https://weightverify.onrender.com",
    );
  });

  it("logs a user in", async () => {
    const response = await request(app).post("/api/auth/login").send({
      email: "testuser@example.com",
      password: "Pass@123",
    });

    expect(response.statusCode).toBe(200);
    expect(response.body.token).toBeDefined();
  });

  it("requires the configured second key for administrator login", async () => {
    const adminAccessKey = "TestAdminAccessKey@123";
    const previousHash = process.env.ADMIN_ACCESS_KEY_HASH;
    process.env.ADMIN_ACCESS_KEY_HASH = await bcrypt.hash(adminAccessKey, 10);
    await User.create({
      name: "Protected Admin",
      email: "protected-admin@example.com",
      phone: "9000000201",
      passwordHash: await bcrypt.hash("ProtectedAdmin@123", 10),
      role: "ADMIN",
      status: "ACTIVE",
    });

    try {
      const denied = await request(app).post("/api/auth/login").send({
        email: "protected-admin@example.com",
        password: "ProtectedAdmin@123",
        adminAccessKey: "incorrect-key",
      });
      expect(denied.statusCode).toBe(401);

      const accepted = await request(app).post("/api/auth/login").send({
        email: "protected-admin@example.com",
        password: "ProtectedAdmin@123",
        adminAccessKey,
      });
      expect(accepted.statusCode).toBe(200);
      expect(accepted.body.token).toBeDefined();
    } finally {
      if (previousHash === undefined) delete process.env.ADMIN_ACCESS_KEY_HASH;
      else process.env.ADMIN_ACCESS_KEY_HASH = previousHash;
    }
  });

  afterAll(async () => {
    await closeDatabase();
  });
});
