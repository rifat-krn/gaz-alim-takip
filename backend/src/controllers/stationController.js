const Station = require('../models/Station');
const { syncStationsFromJson } = require('../services/stationSyncService');
const { loginToAksa } = require('../services/aksaService');

// Get all stations
exports.getAllStations = async (req, res) => {
  try {
    const stations = await Station.find().sort({ order: 1, name: 1 });
    res.json({ success: true, stations });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create station
exports.createStation = async (req, res) => {
  try {
    const { name, u, p, description, order, isActive } = req.body;

    if (!name || !u || !p) {
      return res.status(400).json({ success: false, message: 'İstasyon adı, kullanıcı adı (u) ve şifre (p) zorunludur' });
    }

    const existing = await Station.findOne({ u: u.trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: `'${u}' kullanıcı adına sahip istasyon zaten mevcut` });
    }

    const station = new Station({
      name: name.trim(),
      u: u.trim(),
      p: p.trim(),
      description: description || '',
      order: order !== undefined ? Number(order) : 0,
      isActive: isActive !== undefined ? isActive : true
    });

    await station.save();
    res.status(201).json({ success: true, message: 'İstasyon başarıyla eklendi', station });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update station
exports.updateStation = async (req, res) => {
  try {
    const { id } = req.params;
    const { name, u, p, description, order, isActive } = req.body;

    const station = await Station.findById(id);
    if (!station) {
      return res.status(404).json({ success: false, message: 'İstasyon bulunamadı' });
    }

    if (u && u.trim() !== station.u) {
      const existing = await Station.findOne({ u: u.trim() });
      if (existing) {
        return res.status(400).json({ success: false, message: `'${u}' kullanıcı adı başka istasyonda kayıtlı` });
      }
      station.u = u.trim();
    }

    if (name) station.name = name.trim();
    if (p) station.p = p.trim();
    if (description !== undefined) station.description = description;
    if (order !== undefined) station.order = Number(order);
    if (isActive !== undefined) station.isActive = isActive;

    await station.save();
    res.json({ success: true, message: 'İstasyon güncellendi', station });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete station
exports.deleteStation = async (req, res) => {
  try {
    const { id } = req.params;
    const station = await Station.findByIdAndDelete(id);
    if (!station) {
      return res.status(404).json({ success: false, message: 'İstasyon bulunamadı' });
    }
    res.json({ success: true, message: 'İstasyon silindi' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Sync from istasyon_listesi.json
exports.syncFromJson = async (req, res) => {
  try {
    const result = await syncStationsFromJson();
    if (result.success) {
      const stations = await Station.find().sort({ order: 1, name: 1 });
      return res.json({ success: true, message: result.message, stations });
    } else {
      return res.status(400).json({ success: false, message: result.message });
    }
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Test Aksa OYS Login for a single station
exports.testStationLogin = async (req, res) => {
  try {
    const { id } = req.params;
    const station = await Station.findById(id);
    if (!station) {
      return res.status(404).json({ success: false, message: 'İstasyon bulunamadı' });
    }

    const testRes = await loginToAksa(station.u, station.p);
    return res.json({
      success: testRes.success,
      message: testRes.success ? 'Aksa OYS bağlantısı ve girişi başarılı!' : `Bağlantı hatası: ${testRes.message}`,
      details: testRes
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};
