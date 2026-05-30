import {
  createHospitalService,
  getAllHospitalsService,
  getHospitalByIdService,
  updateHospitalService,
  deleteHospitalService,
  approveHospitalService,
  rejectHospitalService,
  getHospitalStatisticsService,
  getHospitalDashboardService,
  getPublicPlatformStatsService,
} from '../services/hospitalService.js';

export const registerHospitalController = async (req, res) => {
  try {
    const { name, email, password, phone, address, website, licenseNumber, licenseExpiry, description, beds, departments, lng, lat } = req.body;

    if (!name || !email || !password || !phone || !licenseNumber) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    if (!Number.isFinite(Number(lng)) || !Number.isFinite(Number(lat))) {
      return res.status(400).json({ error: 'Hospital location must include valid lng and lat' });
    }

    const hospital = await createHospitalService({
      name,
      email,
      password,
      phone,
      address,
      website,
      licenseNumber,
      licenseExpiry,
      description,
      beds,
      departments,
      lng,
      lat,
      status: 'pending',
      role: 'hospital',
    });

    res.status(201).json({ message: 'Hospital registered successfully. Awaiting approval.', hospital });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const listAllHospitalsController = async (req, res) => {
  try {
    const { status, isVerified } = req.query;
    const filters = {};
    const isAdmin = req.userRole === 'admin';

    if (status) {
      filters.status = status;
    } else if (!isAdmin) {
      filters.status = 'approved';
    }

    if (isVerified !== undefined) filters.isVerified = isVerified === 'true';

    const hospitals = await getAllHospitalsService(filters);
    res.status(200).json(hospitals);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getHospitalController = async (req, res) => {
  try {
    const hospital = await getHospitalByIdService(req.params.id);
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }
    res.status(200).json(hospital);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const updateHospitalDetailsController = async (req, res) => {
  try {
    const hospital = await updateHospitalService(req.params.id, req.body);
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }
    res.status(200).json({ message: 'Hospital updated successfully', hospital });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const deleteHospitalController = async (req, res) => {
  try {
    const result = await deleteHospitalService(req.params.id);
    if (!result) {
      return res.status(404).json({ error: 'Hospital not found' });
    }
    res.status(200).json({ message: 'Hospital deleted successfully' });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const approveHospitalController = async (req, res) => {
  try {
    const hospital = await approveHospitalService(req.params.id);
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }
    res.status(200).json({ message: 'Hospital approved successfully', hospital });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const rejectHospitalController = async (req, res) => {
  try {
    const { reason } = req.body;
    const hospital = await rejectHospitalService(req.params.id, reason);
    if (!hospital) {
      return res.status(404).json({ error: 'Hospital not found' });
    }
    res.status(200).json({ message: 'Hospital rejected', hospital });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getHospitalStatisticsController = async (req, res) => {
  try {
    const stats = await getHospitalStatisticsService();
    res.status(200).json(stats);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getPublicPlatformStatsController = async (req, res) => {
  try {
    const stats = await getPublicPlatformStatsService();
    res.status(200).json(stats);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

export const getMyHospitalDashboardController = async (req, res) => {
  try {
    const dashboard = await getHospitalDashboardService(req.userId);
    res.status(200).json(dashboard);
  } catch (error) {
    if (error.message === 'Hospital not found') {
      return res.status(404).json({ error: error.message });
    }
    res.status(400).json({ error: error.message });
  }
};
