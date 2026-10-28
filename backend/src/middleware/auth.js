import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || "aerosense-sih2026-jwt-secret-key-chennai-monitoring";

/**
 * Sign JWT token for user session
 */
export function signToken(user) {
  return jwt.sign(
    {
      userId: user.userId || user.id,
      email: user.email,
      role: user.role,
      assignedStationId: user.assignedStationId || null,
      name: user.name,
      phone: user.phone || ""
    },
    JWT_SECRET,
    { expiresIn: "7d" }
  );
}

/**
 * Mandatory Authentication Middleware
 */
export function authenticateToken(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (!token) {
    return res.status(401).json({
      success: false,
      error: "Authentication required. Please provide a valid Bearer token."
    });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({
      success: false,
      error: "Invalid or expired session token. Please log in again."
    });
  }
}

/**
 * Optional Authentication Middleware (sets req.user if token present, but doesn't block)
 */
export function optionalAuth(req, res, next) {
  const authHeader = req.headers["authorization"];
  const token = authHeader && authHeader.startsWith("Bearer ") ? authHeader.split(" ")[1] : null;

  if (token) {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      // Ignore invalid token for optional endpoints
    }
  }
  next();
}

/**
 * Require Administrator Role
 */
export function requireAdmin(req, res, next) {
  if (!req.user) {
    return res.status(401).json({ success: false, error: "Authentication required." });
  }

  if (req.user.role !== "admin") {
    return res.status(403).json({
      success: false,
      error: "Access denied. Administrator privileges required.",
      userRole: req.user.role
    });
  }

  next();
}

/**
 * Require Access to a specific station (Admin has universal access; Operator has access ONLY to assignedStationId)
 * @param {string} paramKey - Key in req.params or req.body containing station ID (defaults to 'id')
 */
export function requireStationAccess(paramKey = "id") {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: "Authentication required." });
    }

    const requestedStationId = req.params[paramKey] || req.body?.[paramKey] || req.query?.[paramKey];

    if (!requestedStationId) {
      return next(); // If no specific station target in request, let route handle validation
    }

    // Admins have universal access to all stations
    if (req.user.role === "admin") {
      return next();
    }

    // Station Operators can ONLY access their explicitly assigned station
    if (req.user.role === "operator") {
      if (req.user.assignedStationId === requestedStationId) {
        return next();
      }

      return res.status(403).json({
        success: false,
        code: "ACCESS_DENIED",
        error: `Access Denied. You are authorized exclusively for station ${req.user.assignedStationId}. You cannot access ${requestedStationId}.`,
        userRole: req.user.role,
        assignedStationId: req.user.assignedStationId,
        attemptedStationId: requestedStationId
      });
    }

    return res.status(403).json({
      success: false,
      code: "ACCESS_DENIED",
      error: "Access Denied. Insufficient role permissions."
    });
  };
}
