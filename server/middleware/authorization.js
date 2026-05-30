const authorizeRoles = (...allowedRoles) => {
	return (req, res, next) => {
		if (!req.user) {
			return res.status(401).json({ message: "Unauthenticated request" });
		}

		const role = req.user.role;

		if (!allowedRoles.includes(role)) {
			return res.status(403).json({ message: "Access forbidden" });
		}

		return next();
	};
};

const authorizeOwnerOrRoles = (ownerIdPath = "id", ...allowedRoles) => {
	return (req, res, next) => {
		if (!req.user) {
			return res.status(401).json({ message: "Unauthenticated request" });
		}

		const role = req.user.role;
		const userId = String(req.user.id);
		const ownerId = String(req.params[ownerIdPath] || "");

		if (allowedRoles.includes(role) || userId === ownerId) {
			return next();
		}

		return res.status(403).json({ message: "Access forbidden" });
	};
};

const verifyAdmin = authorizeRoles("admin");

export { authorizeRoles, authorizeOwnerOrRoles, verifyAdmin };
