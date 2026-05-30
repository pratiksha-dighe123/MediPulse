import authentication from "./authentication.js";
import { authorizeRoles, authorizeOwnerOrRoles } from "./authorization.js";

const verifyToken = authentication;

const requireAdmin = (req, res, next) => {
	return verifyToken(req, res, () => authorizeRoles("admin")(req, res, next));
};

const requireRoles = (...roles) => {
	return (req, res, next) => {
		return verifyToken(req, res, () => authorizeRoles(...roles)(req, res, next));
	};
};

const requireOwnerOrAdmin = (ownerIdPath = "id") => {
	return (req, res, next) => {
		return verifyToken(req, res, () => authorizeOwnerOrRoles(ownerIdPath, "admin")(req, res, next));
	};
};

export { verifyToken, requireAdmin, requireRoles, requireOwnerOrAdmin };
export default verifyToken;
