const fs = require('fs');
const path = require('path');
const Station = require('../models/Station');

function formatStationName(u) {
  const customNames = {
    'kepez': 'Kepez İstasyonu',
    'ezine2': 'Ezine 2 İstasyonu',
    'bayramic': 'Bayramiç İstasyonu',
    'can': 'Çan İstasyonu',
    'biga': 'Biga İstasyonu',
    'Gelibolu': 'Gelibolu İstasyonu',
    'lapseki': 'Lapseki İstasyonu',
    'gonen-3': 'Gönen 3 İstasyonu'
  };

  if (customNames[u]) {
    return customNames[u];
  }

  // Fallback format
  return u.charAt(0).toUpperCase() + u.slice(1) + ' İstasyonu';
}

async function syncStationsFromJson(filePath = null) {
  try {
    const jsonPath = filePath || path.join(__dirname, '../../../istasyon_listesi.json');
    if (!fs.existsSync(jsonPath)) {
      console.warn(`[Station Sync] File not found at: ${jsonPath}`);
      return { success: false, message: 'istasyon_listesi.json bulunamadı' };
    }

    const rawData = fs.readFileSync(jsonPath, 'utf8');
    const stationsList = JSON.parse(rawData);

    let insertedCount = 0;
    let updatedCount = 0;

    for (let i = 0; i < stationsList.length; i++) {
      const item = stationsList[i];
      const stationName = formatStationName(item.u);

      const existing = await Station.findOne({ u: item.u });
      if (!existing) {
        await Station.create({
          name: stationName,
          u: item.u,
          p: item.p,
          order: i + 1,
          isActive: true
        });
        insertedCount++;
      } else {
        existing.p = item.p;
        existing.order = i + 1;
        await existing.save();
        updatedCount++;
      }
    }

    console.log(`[Station Sync] Tamamlandı: ${insertedCount} eklendi, ${updatedCount} güncellendi.`);
    return {
      success: true,
      message: `${insertedCount} yeni istasyon eklendi, ${updatedCount} istasyon güncellendi.`,
      insertedCount,
      updatedCount,
      total: stationsList.length
    };
  } catch (error) {
    console.error('[Station Sync Error]:', error.message);
    return { success: false, message: error.message };
  }
}

module.exports = {
  syncStationsFromJson,
  formatStationName
};
