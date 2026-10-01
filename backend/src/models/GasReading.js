const mongoose = require('mongoose');

const fileSchema = new mongoose.Schema({
  originalName: { type: String, required: true },
  filename: { type: String, required: true },
  path: { type: String, required: true },
  relativeUrl: { type: String, required: true },
  size: { type: Number, default: 0 },
  mimeType: { type: String, default: '' },
  uploadedAt: { type: Date, default: Date.now },
  uploadedBy: { type: String, default: '' }
}, { _id: true });

const gasReadingSchema = new mongoose.Schema({
  stationId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Station'
  },
  stationName: {
    type: String,
    required: true
  },
  u: {
    type: String,
    required: true
  },
  gasDate: {
    type: String, // YYYY-MM-DD
    required: true,
    index: true
  },
  dt1: { type: String }, // Örn: 2026-09-30 08:00:00
  dt2: { type: String }, // Örn: 2026-09-30 08:00:00
  dt3: { type: String }, // Örn: 2026-10-01 08:00:00
  
  status: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'DENIED', 'ERROR', 'NO_DATA'],
    default: 'PENDING',
    index: true
  },

  // Ayrıştırılmış Ölçüm Verileri
  consumption: { type: Number, default: null }, // Sm3 (fld_StationTotalCCons / fld_OperatorCCons)
  energy: { type: Number, default: null }, // Enerji (fld_StationTotalEnergyCons / fld_OperatorEnergyCons)
  superiorHeatingValue: { type: Number, default: null }, // Aktif Ho (data[7] / fld_OperatorSuperiorHeatingValue veya fld_StationTotalSuperiorHeatingValue)
  operatorSuperiorHeatingValue: { type: Number, default: null }, // 7 nolu data (fld_OperatorSuperiorHeatingValue)
  stationTotalSuperiorHeatingValue: { type: Number, default: null }, // 30 nolu data (fld_StationTotalSuperiorHeatingValue)
  isSubstitutedSHV: { type: Boolean, default: false }, // Başka istasyon ısıl değeri kullanıldı mı?
  operatorNote: { type: String, default: '' }, // İstasyon / operatör notu (örn: Pera Seramik değerleri kullanılmıştır)
  dataNote: { type: String, default: '' },
  pressure: { type: Number, default: null }, // Basınç Bar (fld_StationTotalPressure)
  temperature: { type: Number, default: null }, // Sıcaklık °C (fld_StationTotalTemperature)
  specificGravity: { type: Number, default: null }, // Özgül ağırlık (fld_OperatorSG)

  // Gaz Bileşimi (Detay)
  composition: {
    methane: { type: Number, default: null },
    ethane: { type: Number, default: null },
    propane: { type: Number, default: null },
    iButane: { type: Number, default: null },
    nButane: { type: Number, default: null },
    iPentane: { type: Number, default: null },
    nPentane: { type: Number, default: null },
    hexane: { type: Number, default: null },
    nitrogen: { type: Number, default: null },
    co2: { type: Number, default: null },
    total: { type: Number, default: null }
  },

  // Yüklenen Belgeler / Dosyalar
  files: [fileSchema],

  // Onay / Red Detayları
  approvalInfo: {
    actionBy: { type: String, default: '' },
    actionAt: { type: Date },
    notes: { type: String, default: '' },
    rejectionReason: { type: String, default: '' }
  },

  // Ham API Yanıtı
  rawData: {
    type: mongoose.Schema.Types.Mixed,
    default: null
  },

  fetchStatus: {
    isFetched: { type: Boolean, default: false },
    fetchedAt: { type: Date },
    errorMessage: { type: String, default: '' }
  }
}, {
  timestamps: true
});

gasReadingSchema.index({ u: 1, gasDate: 1 }, { unique: true });

module.exports = mongoose.model('GasReading', gasReadingSchema);
