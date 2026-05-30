import jwt from "jsonwebtoken";

const getTokenFromHeader = (req) => {
	const authHeader = req.headers.authorization || req.headers.Authorization;

	if (!authHeader || typeof authHeader !== "string") {
		return null;
	}

	if (!authHeader.startsWith("Bearer ")) {
		return null;
	}

	return authHeader.split(" ")[1];
};

const authentication = (req, res, next) => {
	try {
		if (!process.env.JWT_SECRET) {
			return res.status(500).json({ message: "Server configuration error" });
		}

		const token = getTokenFromHeader(req);

		if (!token) {
			return res.status(401).json({ message: "Authorization token is required" });
		}

		const decoded = jwt.verify(token, process.env.JWT_SECRET);

		req.user = decoded;
		req.userId = decoded.id;
		req.userRole = decoded.role;

		return next();
	} catch (error) {
		if (error.name === "TokenExpiredError") {
			return res.status(401).json({ message: "Token has expired" });
		}

		if (error.name === "JsonWebTokenError") {
			return res.status(401).json({ message: "Invalid token" });
		}

		return res.status(500).json({ message: "Authentication failed" });
	}
};

const verifyToken = authentication;

export { authentication, verifyToken };
export default authentication;

