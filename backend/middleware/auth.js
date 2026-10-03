const jwt = require("jsonwebtoken");
const User = require("../models/User");

const authenticate =
  (allowStaffOnboarding = false) =>
  async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Unauthorized access." });
      }

      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET || "dev-secret");
      if (allowStaffOnboarding !== (decoded.purpose === "staff-onboarding")) {
        return res
          .status(403)
          .json({ message: "This token cannot access this endpoint." });
      }

      const user = await User.findById(decoded.id).select("-passwordHash");
      if (!user) {
        return res.status(401).json({ message: "Unauthorized access." });
      }
      if (allowStaffOnboarding) {
        if (
          !["LMO", "GATC"].includes(user.role) ||
          user.status !== "PENDING" ||
          user.staffProfile?.verificationStatus === "VERIFIED"
        ) {
          return res
            .status(403)
            .json({
              message:
                "Staff document onboarding is not available for this account.",
            });
        }
      } else if (user.status !== "ACTIVE") {
        return res.status(403).json({ message: "This account is not active." });
      }

      req.user = user;
      next();
    } catch (error) {
      return res.status(401).json({ message: "Invalid or expired token." });
    }
  };

const protect = authenticate(false);
const protectStaffOnboarding = authenticate(true);

const authorize =
  (...roles) =>
  (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res
        .status(403)
        .json({ message: "Forbidden: insufficient permissions." });
    }
    next();
  };

module.exports = { protect, protectStaffOnboarding, authorize };
