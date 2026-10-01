const express = require('express');
const router = express.Router();
const stationController = require('../controllers/stationController');
const { authenticate, adminOnly } = require('../middleware/authMiddleware');

router.use(authenticate);

// List stations (all authenticated users can read stations)
router.get('/', stationController.getAllStations);

// Admin only actions
router.post('/', adminOnly, stationController.createStation);
router.put('/:id', adminOnly, stationController.updateStation);
router.delete('/:id', adminOnly, stationController.deleteStation);
router.post('/sync-json', adminOnly, stationController.syncFromJson);
router.post('/:id/test-login', adminOnly, stationController.testStationLogin);

module.exports = router;
