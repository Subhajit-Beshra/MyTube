
import jwt from "jsonwebtoken";
import users from "../Modals/Auth.js";

export const requireAuth = async (req, res, next) => {
  let decoded;
  try {
    const token = req.cookies?.mytube_token;

    if (!token) {
      return res.status(401).json({
        message: "Please log in first.",
      });
    }

    decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (
      typeof decoded !== "object" ||
      !decoded.userId
    ) {
      return res.status(401).json({
        message: "Invalid authentication token.",
      });
    }
  } catch {
    return res.status(401).json({
      message: "Your session is invalid or expired. Please log in again.",
    });
  }

  try {
    const user = await users.findById(decoded.userId).select("role accountStatus");
    if (!user) {
      return res.status(401).json({ message: "Your account could not be found." });
    }
    if (user.accountStatus === "suspended") {
      return res.status(403).json({ message: "This account is suspended." });
    }

    req.userId = decoded.userId;
    req.userRole = user.role;
    return next();
  } catch (error) {
    return next(error);
  }
};

export function requireStaff(req, res, next) {
  if (req.userRole !== "staff") {
    return res.status(403).json({ message: "Staff access is required." });
  }
  return next();
}
