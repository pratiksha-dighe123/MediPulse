import {registerPatientService, registerDoctorService, registerDriverService, loginService} from '../services/authService.js';

const loginController = async (req, res) => {
    const { email, password , role} = req.body;

    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }

    if (role && !["admin", "doctor", "patient", "hospital", "driver"].includes(String(role).toLowerCase())) {
        return res.status(400).json({ error: "Invalid role" });
    }

    try {
        const result = await loginService(email, password, role);
        return res.status(200).json(result);
    }   
    catch (error) {
        return res.status(400).json({ error: error.message });
    }
};
const registerController = async (req, res) => {
    const { role } = req.body;

    if (!role) {
        return res.status(400).json({ error: "Role is required" });
    }
    try {
        if (role === "patient") {
            const result = await registerPatientService(req.body);
            return res.status(201).json(result);
        }

        if (role === "doctor") {
            const result = await registerDoctorService(req.body);
            return res.status(201).json(result);
        }

        if (role === "driver") {
            const result = await registerDriverService(req.body);
            return res.status(201).json(result);
        }

        return res.status(400).json({ error: "Invalid role" });
    } catch (error) {
        return res.status(400).json({ error: error.message });
    }
};

const logoutController = (req, res) => {
    return res.status(200).json({ message: "User logged out successfully" });
};

export {loginController, registerController, logoutController};