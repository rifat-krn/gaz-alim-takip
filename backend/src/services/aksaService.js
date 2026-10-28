const axios = require('axios');
const path = require('path');
const fs = require('fs');
const { getGasDayInfo } = require('../utils/gasDateHelper');
const { sanitizeName, parseDateParts } = require('../middleware/uploadMiddleware');

const BASE_URL = process.env.AKSA_BASE_URL || 'http://gazolcumkontrol.aksa.com.tr';
const TIMEOUT_MS = parseInt(process.env.AKSA_TIMEOUT_MS || '10000', 10);

/**
 * Fetch Gas Reading data from Aksa RMSA Data Entrance System for a specific station and gas day
 * 
 * Data Index Mapping:
 * - 5: Düzeltilmiş Tüketim (Sm³) - fld_OperatorCCons
 * - 6: Enerji (kcal cinsinden) - fld_OperatorEnergyCons
 * - 7: Üst Isıl Değer (Ho - kcal/Sm³) - fld_OperatorSuperiorHeatingValue
 * - 8 / 31: Basınç (Bar) - fld_OperatorPressure / fld_StationTotalPressure
 * - 9 / 32: Sıcaklık (°C) - fld_OperatorTemperature / fld_StationTotalTemperature
 * - 10: Atmosfer Basıncı (Atm) - fld_OperatorPressureATM
 * - 11: Metan % (CH4)
 * - 12: Etan % (C2H6)
 * - 13: Propan % (C3H8)
 * - 14: İzo-Bütan % (iC4)
 * - 15: Normal-Bütan % (nC4)
 * - 16: İzo-Pentan % (iC5)
 * - 17: Normal-Pentan % (nC5)
 * - 18: Hekzan+ % (C6+)
 * - 19: Azot % (N2)
 * - 20: Karbondioksit % (CO2)
 * - 21: Toplam Kromatografi %
 * - 23: Operatör Notu / Açıklama - fld_OperatorNote
 * - 33: Özgül Ağırlık - fld_OperatorSG
 */
async function fetchStationGasData(u, p, targetGasDay = null) {
  const gasInfo = getGasDayInfo(targetGasDay);
  
  try {
    const postBody = new URLSearchParams({
      u: u,
      t: '1',
      dt: gasInfo.dt,
      dt2: gasInfo.dt2,
      did: '0',
      dt3: gasInfo.dt3,
      gc_did: '0',
      p: p
    }).toString();

    const response = await axios.post(`${BASE_URL}/ajax/rmsa_data_entrance.ajax.php`, postBody, {
      headers: {
        'Accept': 'text/javascript, text/html, application/xml, text/xml, */*',
        'Accept-Language': 'tr-TR,tr;q=0.9,en-US;q=0.8,en;q=0.7',
        'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
        'X-Prototype-Version': '1.7',
        'X-Requested-With': 'XMLHttpRequest',
        'Referer': `${BASE_URL}/rmsa.php`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/147.0.0.0 Safari/537.36'
      },
      timeout: TIMEOUT_MS,
      validateStatus: () => true
    });

    const responseData = response.data;
    
    // Check if station data exists in response
    if (responseData && (responseData.station || responseData.data)) {
      const d = responseData.data || {};
      const st = responseData.station || {};
      
      // 1. Düzeltilmiş Tüketim (5 nolu veri)
      let consumption = null;
      if (d[5] !== undefined && d[5] !== null && d[5] !== '') {
        consumption = Number(d[5]);
      } else if (d.fld_OperatorCCons !== undefined && d.fld_OperatorCCons !== null) {
        consumption = Number(d.fld_OperatorCCons);
      } else if (d.fld_StationTotalCCons !== undefined && d.fld_StationTotalCCons !== null) {
        consumption = Number(d.fld_StationTotalCCons);
      }

      // 2. Üst Isıl Değer (7 nolu veri - Ho)
      let superiorHeatingValue = null;
      const opSHV = d[7] !== undefined && d[7] !== null && d[7] !== '' 
        ? Number(d[7]) 
        : (d.fld_OperatorSuperiorHeatingValue !== undefined ? Number(d.fld_OperatorSuperiorHeatingValue) : null);
      
      const totSHV = d[30] !== undefined && d[30] !== null && d[30] !== ''
        ? Number(d[30])
        : (d.fld_StationTotalSuperiorHeatingValue !== undefined ? Number(d.fld_StationTotalSuperiorHeatingValue) : null);

      if (opSHV !== null && !isNaN(opSHV) && opSHV > 0) {
        superiorHeatingValue = opSHV;
      } else if (totSHV !== null && !isNaN(totSHV) && totSHV > 0) {
        superiorHeatingValue = totSHV;
      }

      const isSubstitutedSHV = (opSHV !== null && totSHV !== null && Math.abs(opSHV - totSHV) > 0.01) || 
                              d.fld_OperatorSHVSelection === 0 || 
                              d.fld_SHVSelection === 0 || 
                              !!d[23];

      // 3. Enerji (6 nolu veri - kcal cinsinden)
      let energy = null;
      if (d[6] !== undefined && d[6] !== null && d[6] !== '') {
        energy = Number(d[6]);
      } else if (d.fld_OperatorEnergyCons !== undefined && d.fld_OperatorEnergyCons !== null) {
        energy = Number(d.fld_OperatorEnergyCons);
      } else if (d.fld_StationTotalEnergyCons !== undefined && d.fld_StationTotalEnergyCons !== null && Number(d.fld_StationTotalEnergyCons) > 0) {
        energy = Number(d.fld_StationTotalEnergyCons);
      } else if (consumption !== null && superiorHeatingValue !== null) {
        // Formül: Tüketim (Sm3) * Üst Isıl Değer (kcal/Sm3) = Toplam Enerji (kcal)
        energy = Math.round(consumption * superiorHeatingValue);
      }

      // 4. Basınç (Bar) - 31 nolu istasyon toplamı öncelikli, -999 ise 8 nolu operatör basıncı
      let pressure = null;
      if (d[31] !== undefined && d[31] !== null && Number(d[31]) > -900) {
        pressure = Number(d[31]);
      } else if (d[8] !== undefined && d[8] !== null && Number(d[8]) > -900) {
        pressure = Number(d[8]);
      } else if (d.fld_StationTotalPressure !== undefined && Number(d.fld_StationTotalPressure) > -900) {
        pressure = Number(d.fld_StationTotalPressure);
      } else if (d.fld_OperatorPressure !== undefined && Number(d.fld_OperatorPressure) > -900) {
        pressure = Number(d.fld_OperatorPressure);
      }

      // 5. Sıcaklık (°C) - 32 nolu istasyon toplamı öncelikli, -999 ise 9 nolu operatör sıcaklığı
      let temperature = null;
      if (d[32] !== undefined && d[32] !== null && Number(d[32]) > -900) {
        temperature = Number(d[32]);
      } else if (d[9] !== undefined && d[9] !== null && Number(d[9]) > -900) {
        temperature = Number(d[9]);
      } else if (d.fld_StationTotalTemperature !== undefined && Number(d.fld_StationTotalTemperature) > -900) {
        temperature = Number(d.fld_StationTotalTemperature);
      } else if (d.fld_OperatorTemperature !== undefined && Number(d.fld_OperatorTemperature) > -900) {
        temperature = Number(d.fld_OperatorTemperature);
      }

      // 6. Özgül Ağırlık (33 nolu veri - SG)
      let sg = null;
      if (d[33] !== undefined && d[33] !== null && Number(d[33]) > 0) {
        sg = Number(d[33]);
      } else if (d.fld_OperatorSG !== undefined && Number(d.fld_OperatorSG) > 0) {
        sg = Number(d.fld_OperatorSG);
      }

      // 7. Not / Açıklama (23 nolu veri)
      const operatorNote = d[23] || d.fld_OperatorNote || '';
      const dataNote = d.fld_DataNote || '';

      // 8. Gaz Bileşimi (11-21 nolu veriler)
      const composition = {
        methane: d[11] !== undefined ? Number(d[11]) : (d.fld_OperatorCVMethaneC1 ? Number(d.fld_OperatorCVMethaneC1) : null),
        ethane: d[12] !== undefined ? Number(d[12]) : (d.fld_OperatorCVEthaneC2 ? Number(d.fld_OperatorCVEthaneC2) : null),
        propane: d[13] !== undefined ? Number(d[13]) : (d.fld_OperatorCVPropaneC3 ? Number(d.fld_OperatorCVPropaneC3) : null),
        iButane: d[14] !== undefined ? Number(d[14]) : (d.fld_OperatorCVIButaneiC4 ? Number(d.fld_OperatorCVIButaneiC4) : null),
        nButane: d[15] !== undefined ? Number(d[15]) : (d.fld_OperatorCVNButanenC4 ? Number(d.fld_OperatorCVNButanenC4) : null),
        iPentane: d[16] !== undefined ? Number(d[16]) : (d.fld_OperatorCVIPentaneiC5 ? Number(d.fld_OperatorCVIPentaneiC5) : null),
        nPentane: d[17] !== undefined ? Number(d[17]) : (d.fld_OperatorCVNPentanenC5 ? Number(d.fld_OperatorCVNPentanenC5) : null),
        hexane: d[18] !== undefined ? Number(d[18]) : (d.fld_OperatorCVHexaneC6 ? Number(d.fld_OperatorCVHexaneC6) : null),
        nitrogen: d[19] !== undefined ? Number(d[19]) : (d.fld_OperatorCVNitrogenN2 ? Number(d.fld_OperatorCVNitrogenN2) : null),
        co2: d[20] !== undefined ? Number(d[20]) : (d.fld_OperatorCVCarbondioxideCO2 ? Number(d.fld_OperatorCVCarbondioxideCO2) : null),
        total: d[21] !== undefined ? Number(d[21]) : (d.fld_OperatorCVTotal ? Number(d.fld_OperatorCVTotal) : null)
      };

      // 9. Uzak Sunucudaki Operatör Rapor Dosyaları (files)
      const remoteFiles = Array.isArray(d.files) ? d.files : (Array.isArray(responseData.files) ? responseData.files : []);

      return {
        success: true,
        stationName: st.fld_OrganizationName || null,
        gasDate: gasInfo.gasDate,
        dt1: gasInfo.dt1,
        dt2: gasInfo.dt2,
        dt3: gasInfo.dt3,
        consumption: consumption !== null ? Number(consumption) : null,
        energy: energy !== null ? Number(energy) : null, // Enerji (kcal)
        superiorHeatingValue: superiorHeatingValue !== null ? Number(superiorHeatingValue) : null,
        operatorSuperiorHeatingValue: opSHV,
        stationTotalSuperiorHeatingValue: totSHV,
        isSubstitutedSHV,
        operatorNote,
        dataNote,
        pressure: pressure !== null ? Number(pressure) : null,
        temperature: temperature !== null ? Number(temperature) : null,
        specificGravity: sg !== null ? Number(sg) : null,
        composition,
        remoteFiles,
        rawData: responseData
      };
    }

    return {
      success: false,
      gasDate: gasInfo.gasDate,
      dt1: gasInfo.dt1,
      dt2: gasInfo.dt2,
      dt3: gasInfo.dt3,
      error: responseData?.message || 'Veri bulunamadı'
    };

  } catch (error) {
    const isTimeout = error.code === 'ECONNABORTED' || error.message.includes('timeout');
    const msg = isTimeout 
      ? `Zaman aşımı (Timeout - ${TIMEOUT_MS / 1000}s). Sunucu yanıt vermedi.`
      : `Bağlantı hatası: ${error.message}`;

    return {
      success: false,
      gasDate: gasInfo.gasDate,
      dt1: gasInfo.dt1,
      dt2: gasInfo.dt2,
      dt3: gasInfo.dt3,
      error: msg
    };
  }
}

/**
 * Test login / credential check against Aksa RMSA endpoint
 */
async function loginToAksa(u, p) {
  try {
    const gasInfo = getGasDayInfo();
    const result = await fetchStationGasData(u, p, gasInfo.gasDate);
    return {
      success: result.success,
      message: result.success ? 'Aksa RMSA bağlantısı ve kimlik doğrulama başarılı' : (result.error || 'Kimlik doğrulama başarısız'),
      stationName: result.stationName
    };
  } catch (error) {
    return {
      success: false,
      message: `Bağlantı hatası: ${error.message}`
    };
  }
}

/**
 * Download remote files from Aksa RMSA server if not already downloaded and save to local uploads folder
 */
async function syncRemoteFilesForReading(reading, remoteFiles = []) {
  if (!Array.isArray(remoteFiles) || remoteFiles.length === 0) {
    return false;
  }

  const safeStation = sanitizeName(reading.u || reading.stationName || 'istasyon');
  const { year, month, day } = parseDateParts(reading.gasDate);
  const folderName = `${safeStation}-${year}-${month}`;
  const targetDir = path.join(__dirname, '../../uploads', folderName);

  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }

  if (!Array.isArray(reading.files)) {
    reading.files = [];
  }

  let modified = false;

  for (const rf of remoteFiles) {
    if (!rf || !rf.url) continue;

    const origName = rf.name || rf.stored_name || path.basename(rf.url);
    
    // Check if this file is already in reading.files (and physically exists)
    const existingEntry = reading.files.find(f => f.originalName === origName);
    if (existingEntry && existingEntry.path && fs.existsSync(existingEntry.path)) {
      continue;
    }

    try {
      const cleanRelUrl = String(rf.url).replace(/^\/+/, '');
      const downloadUrl = cleanRelUrl.startsWith('http') ? cleanRelUrl : `${BASE_URL}/${cleanRelUrl}`;

      const response = await axios.get(downloadUrl, {
        responseType: 'arraybuffer',
        timeout: TIMEOUT_MS * 2,
        headers: {
          'Referer': `${BASE_URL}/rmsa.php`,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
        }
      });

      if (response.status === 200 && response.data) {
        const ext = path.extname(origName).toLowerCase() || '.pdf';
        let finalFileName = `${safeStation}-${year}-${month}-${day}-gazalimraporu${ext}`;
        let counter = 1;

        // If an entry didn't exist, make sure we don't overwrite another different file on disk
        while (fs.existsSync(path.join(targetDir, finalFileName)) && (!existingEntry || existingEntry.filename !== finalFileName)) {
          finalFileName = `${safeStation}-${year}-${month}-${day}-gazalimraporu-${counter}${ext}`;
          counter++;
        }

        const fullFilePath = path.join(targetDir, finalFileName);
        fs.writeFileSync(fullFilePath, Buffer.from(response.data));

        const relativeUrl = `/uploads/${folderName}/${finalFileName}`;
        const mimeType = response.headers['content-type'] || (ext === '.pdf' ? 'application/pdf' : 'application/octet-stream');
        const size = response.data.byteLength || Buffer.byteLength(response.data);

        if (existingEntry) {
          existingEntry.filename = finalFileName;
          existingEntry.path = fullFilePath;
          existingEntry.relativeUrl = relativeUrl;
          existingEntry.size = size;
          existingEntry.mimeType = mimeType;
        } else {
          reading.files.push({
            originalName: origName,
            filename: finalFileName,
            path: fullFilePath,
            relativeUrl: relativeUrl,
            size: size,
            mimeType: mimeType,
            uploadedAt: new Date(),
            uploadedBy: 'Aksa RMSA (Otomatik)'
          });
        }

        modified = true;
      }
    } catch (err) {
      console.warn(`[Aksa File Download Warning] (${reading.u} - ${origName}):`, err.message);
    }
  }

  return modified;
}

module.exports = {
  loginToAksa,
  fetchStationGasData,
  syncRemoteFilesForReading
};
