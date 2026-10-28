import express from "express";
import bcrypt from "bcryptjs";
import { repository } from "../database/repository.js";
import { signToken, authenticateToken } from "../middleware/auth.js";
import { STATIONS } from "../config/stations.js";

const router = express.Router();

/**
 * POST /api/auth/login
 * Authenticate with email & password, returns JWT token + user profile
 */
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body || {};

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        error: "Email and password are required."
      });
    }

    const user = await repository.findUserByEmail(email);
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or credentials."
      });
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        error: "Invalid email or credentials."
      });
    }

    const token = signToken(user);

    await repository.logAudit("USER_LOGIN", {
      userId: user.userId,
      name: user.name,
      role: user.role,
      email: user.email
    }, user.assignedStationId, { ip: req.ip });

    const safeUser = {
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role,
      assignedStationId: user.assignedStationId,
      phone: user.phone || ""
    };

    res.json({
      success: true,
      token,
      user: safeUser,
      message: `Welcome, ${user.name} (${user.role.toUpperCase()})`
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/auth/me
 * Get current session profile & accessible station list
 */
router.get("/me", authenticateToken, async (req, res) => {
  try {
    const user = await repository.findUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ success: false, error: "User profile not found." });
    }

    const safeUser = {
      userId: user.userId,
      email: user.email,
      name: user.name,
      role: user.role,
      assignedStationId: user.assignedStationId,
      phone: user.phone || ""
    };

    // Calculate accessible stations based on role
    const allStations = STATIONS.map((s) => ({
      id: s.id,
      name: s.name,
      location: s.location
    }));

    const accessibleStations =
      user.role === "admin"
        ? allStations
        : allStations.filter((s) => s.id === user.assignedStationId);

    res.json({
      success: true,
      user: safeUser,
      accessibleStations,
      canAccessAllStations: user.role === "admin"
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/auth/logout
 * End user session
 */
router.post("/logout", authenticateToken, async (req, res) => {
  try {
    await repository.logAudit("USER_LOGOUT", req.user, req.user.assignedStationId);
    res.json({ success: true, message: "Logged out successfully." });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/auth/demo-credentials
 * List pre-configured demo logins for testing and evaluation
 */
router.get("/demo-credentials", (req, res) => {
  res.json({
    success: true,
    roles: [
      {
        role: "admin",
        title: "Administrator (All 5 Stations)",
        email: "admin@aerosense.gov.in",
        password: "Admin@12345",
        description: "Full access to central dashboard, all 5 station dashboards, simulator, SMS configuration, and incident resolution."
      },
      {
        role: "operator",
        title: "Station Operator (STN-001 Marina Coastline)",
        email: "operator1@aerosense.gov.in",
        password: "Operator@12345",
        assignedStationId: "STN-001",
        description: "Assigned strictly to STN-001. Cannot access STN-002, STN-003, etc."
      },
      {
        role: "operator",
        title: "Station Operator (STN-002 T. Nagar Urban Hub)",
        email: "operator2@aerosense.gov.in",
        password: "Operator@12345",
        assignedStationId: "STN-002",
        description: "Assigned strictly to STN-002."
      },
      {
        role: "operator",
        title: "Station Operator (STN-003 Guindy Tech Park)",
        email: "operator3@aerosense.gov.in",
        password: "Operator@12345",
        assignedStationId: "STN-003",
        description: "Assigned strictly to STN-003 (Fault target station)."
      },
      {
        role: "operator",
        title: "Station Operator (STN-004 Velachery Basin)",
        email: "operator4@aerosense.gov.in",
        password: "Operator@12345",
        assignedStationId: "STN-004",
        description: "Assigned strictly to STN-004."
      },
      {
        role: "operator",
        title: "Station Operator (STN-005 Adyar Estuary)",
        email: "operator5@aerosense.gov.in",
        password: "Operator@12345",
        assignedStationId: "STN-005",
        description: "Assigned strictly to STN-005."
      }
    ]
  });
});

export default router;
