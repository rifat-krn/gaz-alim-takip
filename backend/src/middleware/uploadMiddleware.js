const multer = require('multer');
const path = require('path');
const fs = require('fs');

// Helper to sanitize name for filesystem
function sanitizeName(name) {
  return String(name || 'istasyon')
    .trim()
    .replace(/İ/g, 'i')
    .replace(/I/g, 'i')
    .replace(/ı/g, 'i')
    .replace(/Ğ/g, 'g')
    .replace(/ğ/g, 'g')
    .replace(/Ü/g, 'u')
    .replace(/ü/g, 'u')
    .replace(/Ş/g, 's')
    .replace(/ş/g, 's')
    .replace(/Ö/g, 'o')
    .replace(/ö/g, 'o')
    .replace(/Ç/g, 'c')
    .replace(/ç/g, 'c')
    .toLowerCase()
    .replace(/[^a-z0-9]/gi, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

// Helper to extract year, month, day from date string
function parseDateParts(dateStr) {
  if (dateStr && typeof dateStr === 'string' && dateStr.includes('-')) {
    const parts = dateStr.split(' ')[0].split('-');
    if (parts.length >= 3) {
      return {
        year: parts[0],
        month: parts[1].padStart(2, '0'),
        day: parts[2].padStart(2, '0')
      };
    }
  }
  const now = new Date();
  return {
    year: String(now.getFullYear()),
    month: String(now.getMonth() + 1).padStart(2, '0'),
    day: String(now.getDate()).padStart(2, '0')
  };
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const stationIdentifier = req.body.u || (req.user && req.user.stationU) || req.body.stationName || req.query.u || 'istasyon';
    const gasDate = req.body.gasDate || req.query.gasDate || new Date().toISOString().split('T')[0];

    const safeStation = sanitizeName(stationIdentifier);
    const { year, month } = parseDateParts(gasDate);

    // Format: uploads/<istasyonadi>-<yil>-<ay> (örn: uploads/bayramic-2026-09 veya uploads/kepez-2026-09)
    const folderName = `${safeStation}-${year}-${month}`;
    const targetDir = path.join(__dirname, '../../uploads', folderName);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
    }

    cb(null, targetDir);
  },
  filename: function (req, file, cb) {
    const stationIdentifier = req.body.u || (req.user && req.user.stationU) || req.body.stationName || req.query.u || 'istasyon';
    const gasDate = req.body.gasDate || req.query.gasDate || new Date().toISOString().split('T')[0];

    const safeStation = sanitizeName(stationIdentifier);
    const { year, month, day } = parseDateParts(gasDate);

    const originalName = Buffer.from(file.originalname, 'latin1').toString('utf8');
    const ext = path.extname(originalName).toLowerCase() || '.pdf';

    const folderName = `${safeStation}-${year}-${month}`;
    const targetDir = path.join(__dirname, '../../uploads', folderName);

    // Format: <istasyonadi>-<yil>-<ay>-<gun>-gazalimraporu.<ext>
    let finalFileName = `${safeStation}-${year}-${month}-${day}-gazalimraporu${ext}`;
    let counter = 1;

    // Avoid collision if multiple files are uploaded on the same date
    while (fs.existsSync(path.join(targetDir, finalFileName))) {
      finalFileName = `${safeStation}-${year}-${month}-${day}-gazalimraporu-${counter}${ext}`;
      counter++;
    }

    cb(null, finalFileName);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB max file size
  }
});

module.exports = {
  upload,
  sanitizeName,
  parseDateParts
};
