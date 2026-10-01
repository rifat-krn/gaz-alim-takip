const path = require('path');
const fs = require('fs');
const GasReading = require('../models/GasReading');
const Station = require('../models/Station');
const { getGasDayInfo } = require('../utils/gasDateHelper');
const { fetchStationGasData } = require('../services/aksaService');

// Get all readings for a specific gas date
exports.getReadingsByDate = async (req, res) => {
  try {
    const { gasDate } = req.query;
    const gasInfo = getGasDayInfo(gasDate);
    const targetGasDate = gasInfo.gasDate;

    // Filter stations based on user role
    const stationFilter = { isActive: true };
    if (req.user && req.user.role !== 'admin' && req.user.stationU) {
      stationFilter.u = req.user.stationU;
    }

    const stations = await Station.find(stationFilter).sort({ order: 1, name: 1 });

    // Find existing readings for this date
    const readingFilter = { gasDate: targetGasDate };
    if (req.user && req.user.role !== 'admin' && req.user.stationU) {
      readingFilter.u = req.user.stationU;
    }

    const existingReadings = await GasReading.find(readingFilter).populate('stationId');

    // Create a map by username
    const readingMap = {};
    existingReadings.forEach(r => {
      readingMap[r.u] = r;
    });

    // Merge with station list so even non-fetched stations show up
    const results = stations.map(st => {
      const reading = readingMap[st.u];
      if (reading) {
        return reading;
      }
      return {
        stationId: st._id,
        stationName: st.name,
        u: st.u,
        gasDate: targetGasDate,
        dt1: gasInfo.dt1,
        dt2: gasInfo.dt2,
        dt3: gasInfo.dt3,
        status: 'PENDING',
        consumption: null,
        energy: null,
        superiorHeatingValue: null,
        operatorSuperiorHeatingValue: null,
        stationTotalSuperiorHeatingValue: null,
        isSubstitutedSHV: false,
        operatorNote: '',
        dataNote: '',
        pressure: null,
        temperature: null,
        specificGravity: null,
        composition: {},
        files: [],
        approvalInfo: {},
        fetchStatus: { isFetched: false }
      };
    });

    res.json({
      success: true,
      gasInfo,
      readings: results
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Fetch data from Aksa OYS for active stations for a given gas day
exports.fetchAllStationsForDate = async (req, res) => {
  try {
    const { gasDate } = req.body;
    const gasInfo = getGasDayInfo(gasDate);
    const targetGasDate = gasInfo.gasDate;

    // Filter stations: Station Operator only fetches their assigned station
    const stationFilter = { isActive: true };
    if (req.user && req.user.role !== 'admin' && req.user.stationU) {
      stationFilter.u = req.user.stationU;
    }

    const stations = await Station.find(stationFilter).sort({ order: 1, name: 1 });
    if (stations.length === 0) {
      return res.status(400).json({ success: false, message: 'Kayıtlı aktif istasyon bulunamadı veya istasyon erişim yetkiniz yok.' });
    }

    const results = [];
    const errors = [];

    for (const station of stations) {
      try {
        const fetchResult = await fetchStationGasData(station.u, station.p, targetGasDate);

        let reading = await GasReading.findOne({ u: station.u, gasDate: targetGasDate });
        if (!reading) {
          reading = new GasReading({
            stationId: station._id,
            stationName: station.name,
            u: station.u,
            gasDate: targetGasDate,
            dt1: gasInfo.dt1,
            dt2: gasInfo.dt2,
            dt3: gasInfo.dt3,
            status: 'PENDING',
            files: []
          });
        }

        reading.dt1 = gasInfo.dt1;
        reading.dt2 = gasInfo.dt2;
        reading.dt3 = gasInfo.dt3;

        if (fetchResult.success) {
          reading.consumption = fetchResult.consumption;
          reading.energy = fetchResult.energy;
          reading.superiorHeatingValue = fetchResult.superiorHeatingValue;
          reading.operatorSuperiorHeatingValue = fetchResult.operatorSuperiorHeatingValue;
          reading.stationTotalSuperiorHeatingValue = fetchResult.stationTotalSuperiorHeatingValue;
          reading.isSubstitutedSHV = fetchResult.isSubstitutedSHV;
          reading.operatorNote = fetchResult.operatorNote;
          reading.dataNote = fetchResult.dataNote;
          reading.pressure = fetchResult.pressure;
          reading.temperature = fetchResult.temperature;
          reading.specificGravity = fetchResult.specificGravity;
          reading.composition = fetchResult.composition;
          reading.rawData = fetchResult.rawData;
          reading.fetchStatus = {
            isFetched: true,
            fetchedAt: new Date(),
            errorMessage: ''
          };
        } else {
          reading.fetchStatus = {
            isFetched: false,
            fetchedAt: new Date(),
            errorMessage: fetchResult.error || 'Veri çekilemedi'
          };
          errors.push({ station: station.name, error: fetchResult.error });
        }

        await reading.save();
        results.push(reading);
      } catch (stErr) {
        errors.push({ station: station.name, error: stErr.message });
      }
    }

    res.json({
      success: true,
      message: `${results.length} istasyon verisi sorgulandı.`,
      gasInfo,
      readings: results,
      errors
    });
  } catch (error) {
    console.error('[Fetch All Readings Error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Fetch single station for date
exports.fetchSingleStationReading = async (req, res) => {
  try {
    const { stationId, gasDate } = req.body;
    const station = await Station.findById(stationId);
    if (!station) {
      return res.status(404).json({ success: false, message: 'İstasyon bulunamadı' });
    }

    // Security check: Station operator can only fetch their own station
    if (req.user && req.user.role !== 'admin' && req.user.stationU && station.u !== req.user.stationU) {
      return res.status(403).json({ success: false, message: 'Bu istasyonun verilerini sorgulama yetkiniz bulunmamaktadır.' });
    }

    const gasInfo = getGasDayInfo(gasDate);
    const targetGasDate = gasInfo.gasDate;

    const fetchResult = await fetchStationGasData(station.u, station.p, targetGasDate);

    let reading = await GasReading.findOne({ u: station.u, gasDate: targetGasDate });
    if (!reading) {
      reading = new GasReading({
        stationId: station._id,
        stationName: station.name,
        u: station.u,
        gasDate: targetGasDate,
        dt1: gasInfo.dt1,
        dt2: gasInfo.dt2,
        dt3: gasInfo.dt3,
        status: 'PENDING',
        files: []
      });
    }

    if (fetchResult.success) {
      reading.consumption = fetchResult.consumption;
      reading.energy = fetchResult.energy;
      reading.superiorHeatingValue = fetchResult.superiorHeatingValue;
      reading.operatorSuperiorHeatingValue = fetchResult.operatorSuperiorHeatingValue;
      reading.stationTotalSuperiorHeatingValue = fetchResult.stationTotalSuperiorHeatingValue;
      reading.isSubstitutedSHV = fetchResult.isSubstitutedSHV;
      reading.operatorNote = fetchResult.operatorNote;
      reading.dataNote = fetchResult.dataNote;
      reading.pressure = fetchResult.pressure;
      reading.temperature = fetchResult.temperature;
      reading.specificGravity = fetchResult.specificGravity;
      reading.composition = fetchResult.composition;
      reading.rawData = fetchResult.rawData;
      reading.fetchStatus = {
        isFetched: true,
        fetchedAt: new Date(),
        errorMessage: ''
      };
    } else {
      reading.fetchStatus = {
        isFetched: false,
        fetchedAt: new Date(),
        errorMessage: fetchResult.error || 'Veri çekilemedi'
      };
    }

    await reading.save();

    res.json({
      success: fetchResult.success,
      message: fetchResult.success ? 'İstasyon verisi güncellendi' : `Veri alınamadı: ${fetchResult.error}`,
      reading
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Approve reading
exports.approveReading = async (req, res) => {
  try {
    const { id } = req.params;
    const { notes } = req.body;

    const reading = await GasReading.findById(id);
    if (!reading) {
      return res.status(404).json({ success: false, message: 'Okuma kaydı bulunamadı' });
    }

    // Security check: Station operator can only approve their own station reading
    if (req.user && req.user.role !== 'admin' && req.user.stationU && reading.u !== req.user.stationU) {
      return res.status(403).json({ success: false, message: 'Bu kaydı onaylama yetkiniz bulunmamaktadır.' });
    }

    reading.status = 'APPROVED';
    reading.approvalInfo = {
      actionBy: req.user ? req.user.fullName : 'Admin',
      actionAt: new Date(),
      notes: notes || '',
      rejectionReason: ''
    };

    await reading.save();

    res.json({
      success: true,
      message: `${reading.stationName} okuması başarıyla onaylandı.`,
      reading
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Deny reading
exports.denyReading = async (req, res) => {
  try {
    const { id } = req.params;
    const { rejectionReason, notes } = req.body;

    if (!rejectionReason || !rejectionReason.trim()) {
      return res.status(400).json({ success: false, message: 'Ret sebebi belirtilmelidir' });
    }

    const reading = await GasReading.findById(id);
    if (!reading) {
      return res.status(404).json({ success: false, message: 'Okuma kaydı bulunamadı' });
    }

    // Security check
    if (req.user && req.user.role !== 'admin' && req.user.stationU && reading.u !== req.user.stationU) {
      return res.status(403).json({ success: false, message: 'Bu kaydı reddetme yetkiniz bulunmamaktadır.' });
    }

    reading.status = 'DENIED';
    reading.approvalInfo = {
      actionBy: req.user ? req.user.fullName : 'Admin',
      actionAt: new Date(),
      notes: notes || '',
      rejectionReason: rejectionReason.trim()
    };

    await reading.save();

    res.json({
      success: true,
      message: `${reading.stationName} okuması reddedildi.`,
      reading
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Upload files for a station reading
exports.uploadReadingFiles = async (req, res) => {
  try {
    let { u, stationName, gasDate } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ success: false, message: 'Yüklenecek dosya seçilmedi' });
    }

    // Security check: Station operator can only upload files for their own station
    if (req.user && req.user.role !== 'admin' && req.user.stationU) {
      u = req.user.stationU;
    }

    const gasInfo = getGasDayInfo(gasDate);
    const targetGasDate = gasInfo.gasDate;

    let reading = await GasReading.findOne({ u, gasDate: targetGasDate });
    if (!reading) {
      const station = await Station.findOne({ u });
      reading = new GasReading({
        stationId: station ? station._id : null,
        stationName: stationName || (station ? station.name : u),
        u,
        gasDate: targetGasDate,
        dt1: gasInfo.dt1,
        dt2: gasInfo.dt2,
        dt3: gasInfo.dt3,
        status: 'PENDING',
        files: []
      });
    }

    // Process attached files
    const fileEntries = files.map(file => {
      const relativePath = path.relative(path.join(__dirname, '../../uploads'), file.path).replace(/\\/g, '/');
      return {
        originalName: Buffer.from(file.originalname, 'latin1').toString('utf8'),
        filename: file.filename,
        path: file.path,
        relativeUrl: `/uploads/${relativePath}`,
        size: file.size,
        mimeType: file.mimetype,
        uploadedAt: new Date(),
        uploadedBy: req.user ? req.user.fullName : 'Admin'
      };
    });

    reading.files.push(...fileEntries);
    await reading.save();

    res.json({
      success: true,
      message: `${fileEntries.length} dosya başarıyla yüklendi.`,
      files: reading.files,
      reading
    });
  } catch (error) {
    console.error('[File Upload Error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete attached file
exports.deleteReadingFile = async (req, res) => {
  try {
    const { readingId, fileId } = req.params;

    const reading = await GasReading.findById(readingId);
    if (!reading) {
      return res.status(404).json({ success: false, message: 'Okuma kaydı bulunamadı' });
    }

    // Security check
    if (req.user && req.user.role !== 'admin' && req.user.stationU && reading.u !== req.user.stationU) {
      return res.status(403).json({ success: false, message: 'Bu dosyayı silme yetkiniz bulunmamaktadır.' });
    }

    const fileDoc = reading.files.id(fileId);
    if (!fileDoc) {
      return res.status(404).json({ success: false, message: 'Dosya kaydı bulunamadı' });
    }

    if (fs.existsSync(fileDoc.path)) {
      try {
        fs.unlinkSync(fileDoc.path);
      } catch (err) {
        console.warn('Could not delete physical file:', err.message);
      }
    }

    reading.files.pull({ _id: fileId });
    await reading.save();

    res.json({
      success: true,
      message: 'Dosya silindi',
      files: reading.files
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get History / Archive
exports.getHistory = async (req, res) => {
  try {
    const { startDate, endDate, u, status } = req.query;
    const filter = {};

    if (startDate && endDate) {
      filter.gasDate = { $gte: startDate, $lte: endDate };
    } else if (startDate) {
      filter.gasDate = { $gte: startDate };
    } else if (endDate) {
      filter.gasDate = { $lte: endDate };
    }

    // If user is a station operator, lock history to their assigned station
    if (req.user && req.user.role !== 'admin' && req.user.stationU) {
      filter.u = req.user.stationU;
    } else if (u) {
      filter.u = u;
    }

    if (status) {
      filter.status = status;
    }

    const history = await GasReading.find(filter)
      .sort({ gasDate: -1, stationName: 1 })
      .populate('stationId');

    res.json({
      success: true,
      count: history.length,
      history
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Fetch History Range from Aksa RMSA on-demand
exports.fetchHistoryRange = async (req, res) => {
  try {
    const { startDate, endDate, u } = req.body;
    if (!startDate || !endDate) {
      return res.status(400).json({ success: false, message: 'Başlangıç ve bitiş tarihleri zorunludur.' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    if (start > end) {
      return res.status(400).json({ success: false, message: 'Başlangıç tarihi bitiş tarihinden büyük olamaz.' });
    }

    // Limit range to 60 days
    const diffDays = Math.ceil((end - start) / (1000 * 60 * 60 * 24)) + 1;
    if (diffDays > 62) {
      return res.status(400).json({ success: false, message: 'En fazla 60 günlük tarih aralığı sorgulanabilir.' });
    }

    // Find target stations
    let stationFilter = { isActive: true };
    if (req.user && req.user.role !== 'admin' && req.user.stationU) {
      stationFilter.u = req.user.stationU;
    } else if (u) {
      stationFilter.u = u;
    }

    const stations = await Station.find(stationFilter);
    if (stations.length === 0) {
      return res.status(404).json({ success: false, message: 'Sorgulanacak aktif istasyon bulunamadı.' });
    }

    // Generate date array (from start to end)
    const dates = [];
    const curr = new Date(start);
    while (curr <= end) {
      dates.push(curr.toISOString().split('T')[0]);
      curr.setDate(curr.getDate() + 1);
    }

    // Fetch for each date and station
    for (const d of dates) {
      const gasInfo = getGasDayInfo(d);
      for (const st of stations) {
        try {
          const fetchResult = await fetchStationGasData(st.u, st.p, d);
          let reading = await GasReading.findOne({ u: st.u, gasDate: d });
          if (!reading) {
            reading = new GasReading({
              stationId: st._id,
              stationName: st.name,
              u: st.u,
              gasDate: d,
              dt1: gasInfo.dt1,
              dt2: gasInfo.dt2,
              dt3: gasInfo.dt3,
              status: 'PENDING',
              files: []
            });
          }

          if (fetchResult.success) {
            reading.consumption = fetchResult.consumption;
            reading.energy = fetchResult.energy;
            reading.superiorHeatingValue = fetchResult.superiorHeatingValue;
            reading.operatorSuperiorHeatingValue = fetchResult.operatorSuperiorHeatingValue;
            reading.stationTotalSuperiorHeatingValue = fetchResult.stationTotalSuperiorHeatingValue;
            reading.isSubstitutedSHV = fetchResult.isSubstitutedSHV;
            reading.operatorNote = fetchResult.operatorNote;
            reading.dataNote = fetchResult.dataNote;
            reading.pressure = fetchResult.pressure;
            reading.temperature = fetchResult.temperature;
            reading.specificGravity = fetchResult.specificGravity;
            reading.composition = fetchResult.composition;
            reading.rawData = fetchResult.rawData;
            reading.fetchStatus = {
              isFetched: true,
              fetchedAt: new Date(),
              errorMessage: ''
            };
          }
          await reading.save();
        } catch (err) {
          console.warn(`Fetch range error for ${st.u} on ${d}:`, err.message);
        }
      }
    }

    // Return updated history records for the range
    const filter = {
      gasDate: { $gte: startDate, $lte: endDate }
    };
    if (req.user && req.user.role !== 'admin' && req.user.stationU) {
      filter.u = req.user.stationU;
    } else if (u) {
      filter.u = u;
    }

    const history = await GasReading.find(filter)
      .sort({ gasDate: -1, stationName: 1 })
      .populate('stationId');

    res.json({
      success: true,
      message: `${dates.length} günlük geçmiş verileri Aksa RMSA üzerinden başarıyla çekildi ve güncellendi.`,
      count: history.length,
      history
    });
  } catch (error) {
    console.error('[Fetch History Range Error]:', error);
    res.status(500).json({ success: false, message: error.message });
  }
};
