const express = require('express');
const router = express.Router();
const readingController = require('../controllers/readingController');
const { authenticate } = require('../middleware/authMiddleware');
const { upload } = require('../middleware/uploadMiddleware');

router.use(authenticate);

// Query readings for specific gas date
router.get('/by-date', readingController.getReadingsByDate);

// Fetch all stations data from Aksa OYS for a date
router.post('/fetch-all', readingController.fetchAllStationsForDate);

// Fetch single station data
router.post('/fetch-single', readingController.fetchSingleStationReading);

// Approve reading
router.post('/:id/approve', readingController.approveReading);

// Deny reading
router.post('/:id/deny', readingController.denyReading);

// Upload files for a station reading
router.post('/upload', upload.array('files', 10), readingController.uploadReadingFiles);

// Delete uploaded file
router.delete('/:readingId/file/:fileId', readingController.deleteReadingFile);

// Archive / History
router.get('/history', readingController.getHistory);
router.post('/fetch-range', readingController.fetchHistoryRange);

module.exports = router;
