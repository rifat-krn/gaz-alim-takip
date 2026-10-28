const cron = require('node-cron');
const nodemailer = require('nodemailer');
const NotificationSetting = require('../models/NotificationSetting');
const Station = require('../models/Station');
const User = require('../models/User');
const GasReading = require('../models/GasReading');
const { getGasDayInfo } = require('../utils/gasDateHelper');
const { fetchStationGasData, syncRemoteFilesForReading } = require('./aksaService');

async function ensureStationReadingForDate(station, gasDate) {
  let existing = await GasReading.findOne({ u: station.u, gasDate });
  if ((!existing || !existing.fetchStatus?.isFetched) && station.u && station.p) {
    try {
      const gasInfo = getGasDayInfo(gasDate);
      const fetchResult = await fetchStationGasData(station.u, station.p, gasDate);
      if (fetchResult && fetchResult.success) {
        if (!existing) {
          existing = new GasReading({
            stationId: station._id,
            stationName: station.name,
            u: station.u,
            gasDate,
            dt1: gasInfo.dt1,
            dt2: gasInfo.dt2,
            dt3: gasInfo.dt3,
            status: 'PENDING',
            files: []
          });
        }
        existing.dt1 = gasInfo.dt1;
        existing.dt2 = gasInfo.dt2;
        existing.dt3 = gasInfo.dt3;
        existing.consumption = fetchResult.consumption;
        existing.energy = fetchResult.energy;
        existing.superiorHeatingValue = fetchResult.superiorHeatingValue;
        existing.operatorSuperiorHeatingValue = fetchResult.operatorSuperiorHeatingValue;
        existing.stationTotalSuperiorHeatingValue = fetchResult.stationTotalSuperiorHeatingValue;
        existing.isSubstitutedSHV = fetchResult.isSubstitutedSHV;
        existing.operatorNote = fetchResult.operatorNote;
        existing.dataNote = fetchResult.dataNote;
        existing.pressure = fetchResult.pressure;
        existing.temperature = fetchResult.temperature;
        existing.specificGravity = fetchResult.specificGravity;
        existing.composition = fetchResult.composition;
        existing.rawData = fetchResult.rawData;
        existing.fetchStatus = {
          isFetched: true,
          fetchedAt: new Date(),
          errorMessage: ''
        };
        if (fetchResult.remoteFiles && fetchResult.remoteFiles.length > 0) {
          await syncRemoteFilesForReading(existing, fetchResult.remoteFiles);
        }
        await existing.save();
      }
    } catch (err) {
      console.error(`[DailyCheck] Auto-fetch error for ${station.u} (${gasDate}):`, err.message);
    }
  }
  return existing;
}

let scheduledTask = null;

const getYesterdayDateStr = () => {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return d.toISOString().split('T')[0];
};

const getTodayDateStr = () => {
  return new Date().toISOString().split('T')[0];
};

async function getOrCreateSettings() {
  let settings = await NotificationSetting.findOne({ key: 'DAILY_REPORT_CHECK' });
  if (!settings) {
    settings = await NotificationSetting.create({
      key: 'DAILY_REPORT_CHECK',
      enabled: true,
      dailyRunTime: '09:30',
      checkTarget: 'YESTERDAY',
      sendMode: 'ALL',
      autoFetchBeforeCheck: true,
      adminToEmails: [],
      adminCcEmails: []
    });
  }
  return settings;
}

function createTransporter(settings) {
  const host = settings.smtpHost || process.env.SMTP_HOST;
  const port = Number(settings.smtpPort || process.env.SMTP_PORT || 587);
  const secure = settings.smtpSecure !== undefined ? settings.smtpSecure : process.env.SMTP_SECURE === 'true';
  const user = settings.smtpUser || process.env.SMTP_USER;
  const pass = settings.smtpPass || process.env.SMTP_PASS;

  if (!host) {
    return null;
  }

  const transportConfig = {
    host,
    port,
    secure,
    tls: {
      rejectUnauthorized: false
    }
  };

  if (user && pass) {
    transportConfig.auth = { user, pass };
  }

  return nodemailer.createTransport(transportConfig);
}

function buildStationEmailHtml(station, reading, gasDate) {
  const status = reading?.status || 'PENDING';
  const isApproved = status === 'APPROVED';
  const isDenied = status === 'DENIED';
  const hasFiles = reading?.files && reading.files.length > 0;

  const badgeBg = isApproved ? '#d1fae5' : isDenied ? '#ffe4e6' : '#fef3c7';
  const badgeColor = isApproved ? '#065f46' : isDenied ? '#9f1239' : '#92400e';
  const statusLabel = isApproved
    ? 'ONAYLANDI'
    : isDenied
    ? 'REDDEDİLDİ (KONTROL GEREKLİ)'
    : 'HENÜZ ONAYLANMADI (ONAY BEKLİYOR)';

  const consumptionStr = reading?.consumption != null
    ? `${Number(reading.consumption).toLocaleString('tr-TR')} Sm³`
    : 'Veri Yok';
  const energyStr = reading?.energy != null
    ? `${Number(reading.energy).toLocaleString('tr-TR')} kcal`
    : 'Veri Yok';
  const shvStr = reading?.superiorHeatingValue != null
    ? `${Number(reading.superiorHeatingValue).toLocaleString('tr-TR')} kcal/Sm³`
    : 'Veri Yok';

  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 640px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
      <div style="background: #0f172a; color: #ffffff; padding: 18px 24px;">
        <h2 style="margin: 0; font-size: 18px;">Gaz Alım Takip Sistemi - Günlük Rapor Onay Kontrolü</h2>
        <p style="margin: 4px 0 0; font-size: 12px; color: #94a3b8;">İstasyon: <strong>${station.name} (${station.u})</strong> | Gaz Günü: <strong>${gasDate}</strong></p>
      </div>
      <div style="padding: 24px;">
        <div style="margin-bottom: 18px; padding: 14px 16px; border-radius: 10px; background: ${badgeBg}; color: ${badgeColor}; font-weight: 700; font-size: 14px;">
          Durum: ${statusLabel}
        </div>
        <table style="width: 100%; border-collapse: collapse; font-size: 13px; color: #1e293b;">
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;">İstasyon Adı / Kodu</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600; text-align: right;">${station.name} (${station.u})</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;">Gaz Günü</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600; text-align: right;">${gasDate}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;">5 - Düzeltilmiş Tüketim</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-weight: 700; text-align: right;">${consumptionStr}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;">6 - Toplam Enerji</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-weight: 700; text-align: right;">${energyStr}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;">7 - Üst Isıl Değer (Ho)</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600; text-align: right;">${shvStr}</td>
          </tr>
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;">PDF Gaz Alım Raporu</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600; text-align: right;">
              ${hasFiles ? `Yüklü (${reading.files.length} Dosya)` : 'Rapor Dosyası Bulunamadı'}
            </td>
          </tr>
          ${reading?.approvalInfo?.actionAt ? `
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #64748b;">Son İşlem Zamanı & Kullanıcı</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600; text-align: right;">
              ${new Date(reading.approvalInfo.actionAt).toLocaleString('tr-TR')} (${reading.approvalInfo.actionBy || '-'})
            </td>
          </tr>
          ` : ''}
          ${reading?.approvalInfo?.rejectionReason ? `
          <tr>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; color: #9f1239;">Ret Sebebi</td>
            <td style="padding: 8px 0; border-bottom: 1px solid #f1f5f9; font-weight: 600; color: #9f1239; text-align: right;">
              ${reading.approvalInfo.rejectionReason}
            </td>
          </tr>
          ` : ''}
        </table>
        ${!isApproved ? `
          <p style="margin-top: 18px; font-size: 12px; color: #475569;">
            Lütfen Gaz Alım Takip Sistemi'ne giriş yaparak <strong>${gasDate}</strong> tarihli istasyon verilerini ve PDF raporunu kontrol edip onay işlemini tamamlayınız.
          </p>
        ` : ''}
      </div>
    </div>
  `;
}

function buildAdminSummaryHtml(gasDate, rows) {
  const approvedCount = rows.filter(r => r.readingStatus === 'APPROVED').length;
  const pendingCount = rows.filter(r => r.readingStatus === 'PENDING').length;
  const deniedCount = rows.filter(r => r.readingStatus === 'DENIED').length;

  const tableRowsHtml = rows.map((r, idx) => {
    const statusColor = r.readingStatus === 'APPROVED'
      ? '#059669'
      : r.readingStatus === 'DENIED'
      ? '#e11d48'
      : '#d97706';
    const statusText = r.readingStatus === 'APPROVED'
      ? 'ONAYLANDI'
      : r.readingStatus === 'DENIED'
      ? 'REDDEDİLDİ'
      : 'BEKLEMEDE';

    return `
      <tr>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0;">${idx + 1}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; font-weight: 600;">${r.stationName} (${r.u})</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: right;">${r.consumption != null ? Number(r.consumption).toLocaleString('tr-TR') + ' Sm³' : '—'}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: center;">${r.hasReportFile ? 'Var' : 'Yok'}</td>
        <td style="padding: 8px 10px; border-bottom: 1px solid #e2e8f0; text-align: center; font-weight: 700; color: ${statusColor};">${statusText}</td>
      </tr>
    `;
  }).join('');

  return `
    <div style="font-family: 'Segoe UI', Arial, sans-serif; max-width: 720px; margin: 0 auto; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; background: #ffffff;">
      <div style="background: #0f172a; color: #ffffff; padding: 18px 24px;">
        <h2 style="margin: 0; font-size: 18px;">Günlük Gaz Alım Raporları Onay Durum Özeti</h2>
        <p style="margin: 4px 0 0; font-size: 12px; color: #94a3b8;">Gaz Günü: <strong>${gasDate}</strong> | Toplam: ${rows.length} İstasyon (${approvedCount} Onaylı, ${pendingCount} Bekleyen, ${deniedCount} Red)</p>
      </div>
      <div style="padding: 20px;">
        <table style="width: 100%; border-collapse: collapse; font-size: 12px; color: #1e293b;">
          <thead>
            <tr style="background: #f8fafc; text-align: left;">
              <th style="padding: 8px 10px; border-bottom: 2px solid #e2e8f0;">#</th>
              <th style="padding: 8px 10px; border-bottom: 2px solid #e2e8f0;">İstasyon</th>
              <th style="padding: 8px 10px; border-bottom: 2px solid #e2e8f0; text-align: right;">Tüketim</th>
              <th style="padding: 8px 10px; border-bottom: 2px solid #e2e8f0; text-align: center;">PDF Rapor</th>
              <th style="padding: 8px 10px; border-bottom: 2px solid #e2e8f0; text-align: center;">Durum</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

async function runDailyApprovalCheck({ targetGasDate = null, triggerType = 'CRON' } = {}) {
  const settings = await getOrCreateSettings();
  const gasDate = targetGasDate || (settings.checkTarget === 'TODAY' ? getTodayDateStr() : getYesterdayDateStr());

  const stations = await Station.find({ isActive: true }).sort({ order: 1, name: 1 });
  const users = await User.find({ isActive: true }).populate('assignedStation');

  // Ensure readings are loaded (and optionally auto-fetched if missing)
  if (settings.autoFetchBeforeCheck) {
    for (const station of stations) {
      await ensureStationReadingForDate(station, gasDate);
    }
  }

  const readings = await GasReading.find({ gasDate });
  const readingMap = {};
  readings.forEach(r => {
    readingMap[r.u] = r;
  });

  const transporter = createTransporter(settings);
  const smtpConfigured = !!transporter;
  const senderAddress = settings.fromEmail || settings.smtpUser || process.env.SMTP_FROM_EMAIL || 'noreply@gazalimtakip.local';
  const senderHeader = `"${settings.fromName || 'Gaz Alım Takip Sistemi'}" <${senderAddress}>`;

  let emailsSent = 0;
  let emailsFailed = 0;
  let firstErrorMsg = '';
  const stationDispatches = [];
  const summaryRows = [];

  for (const station of stations) {
    const reading = readingMap[station.u] || null;
    const readingStatus = reading?.status || 'PENDING';
    const hasReportFile = !!(reading?.files && reading.files.length > 0);

    // Find users linked to this station
    const stationUsers = users.filter(u =>
      u.emailNotificationsEnabled !== false &&
      (u.stationU === station.u || (u.assignedStation && String(u.assignedStation._id || u.assignedStation) === String(station._id)))
    );

    const toEmails = [...new Set(stationUsers.flatMap(u => u.toEmails || []).filter(Boolean))];
    const ccEmails = [...new Set(stationUsers.flatMap(u => u.ccEmails || []).filter(Boolean))];

    summaryRows.push({
      stationName: station.name,
      u: station.u,
      consumption: reading?.consumption ?? null,
      readingStatus,
      hasReportFile,
      toEmails,
      ccEmails
    });

    const shouldSendForStatus = settings.sendMode === 'ALL' || readingStatus !== 'APPROVED';

    if (!shouldSendForStatus) {
      stationDispatches.push({
        stationName: station.name,
        u: station.u,
        readingStatus,
        hasReportFile,
        toEmails,
        ccEmails,
        deliveryStatus: 'SKIPPED_APPROVED',
        message: 'Onaylı olduğu için atlandı (Sadece onaylanmayanlar modu)'
      });
      continue;
    }

    if (toEmails.length === 0 && ccEmails.length === 0) {
      stationDispatches.push({
        stationName: station.name,
        u: station.u,
        readingStatus,
        hasReportFile,
        toEmails: [],
        ccEmails: [],
        deliveryStatus: 'NO_RECIPIENT',
        message: 'Gönderim Başarısız: Bu istasyon için tanımlı TO veya CC e-posta adresi yok'
      });
      continue;
    }

    const subjectStatus = readingStatus === 'APPROVED'
      ? 'ONAYLANDI'
      : readingStatus === 'DENIED'
      ? 'REDDEDİLDİ - KONTROL GEREKLİ'
      : 'ONAY BEKLİYOR';

    const subject = `[Gaz Alım Kontrol] ${station.name} (${gasDate}) - ${subjectStatus}`;
    const html = buildStationEmailHtml(station, reading, gasDate);

    if (transporter) {
      try {
        await transporter.sendMail({
          from: senderHeader,
          to: toEmails.length > 0 ? toEmails.join(', ') : ccEmails.join(', '),
          cc: toEmails.length > 0 && ccEmails.length > 0 ? ccEmails.join(', ') : undefined,
          subject,
          html
        });
        emailsSent++;
        stationDispatches.push({
          stationName: station.name,
          u: station.u,
          readingStatus,
          hasReportFile,
          toEmails,
          ccEmails,
          deliveryStatus: 'SENT',
          message: `E-posta başarıyla gönderildi (${toEmails.length} TO, ${ccEmails.length} CC)`
        });
      } catch (mailErr) {
        emailsFailed++;
        if (!firstErrorMsg) firstErrorMsg = mailErr.message;
        stationDispatches.push({
          stationName: station.name,
          u: station.u,
          readingStatus,
          hasReportFile,
          toEmails,
          ccEmails,
          deliveryStatus: 'ERROR',
          message: `E-posta gönderimi başarısız (SMTP Hatası: ${mailErr.message})`
        });
      }
    } else {
      emailsFailed++;
      if (!firstErrorMsg) firstErrorMsg = 'SMTP sunucu ayarları (SMTP Host) tanımlanmamış';
      stationDispatches.push({
        stationName: station.name,
        u: station.u,
        readingStatus,
        hasReportFile,
        toEmails,
        ccEmails,
        deliveryStatus: 'ERROR',
        message: `E-posta gönderimi başarısız: SMTP sunucu ayarları tanımlanmamış`
      });
    }
  }

  // Also check global admin recipients + admin user emails
  const adminUsers = users.filter(u => u.role === 'admin' && u.emailNotificationsEnabled !== false);
  const globalTo = [
    ...new Set([
      ...(settings.adminToEmails || []),
      ...adminUsers.flatMap(u => u.toEmails || [])
    ].filter(Boolean))
  ];
  const globalCc = [
    ...new Set([
      ...(settings.adminCcEmails || []),
      ...adminUsers.flatMap(u => u.ccEmails || [])
    ].filter(Boolean))
  ];

  if (globalTo.length > 0 || globalCc.length > 0) {
    const summaryHtml = buildAdminSummaryHtml(gasDate, summaryRows);
    const summarySubject = `[Günlük Özet] Gaz Alım Raporları Onay Durumu (${gasDate})`;
    if (transporter) {
      try {
        await transporter.sendMail({
          from: senderHeader,
          to: globalTo.length > 0 ? globalTo.join(', ') : globalCc.join(', '),
          cc: globalTo.length > 0 && globalCc.length > 0 ? globalCc.join(', ') : undefined,
          subject: summarySubject,
          html: summaryHtml
        });
        emailsSent++;
      } catch (err) {
        emailsFailed++;
        if (!firstErrorMsg) firstErrorMsg = err.message;
        console.error('[DailyCheck] Admin summary email error:', err.message);
      }
    } else {
      emailsFailed++;
      if (!firstErrorMsg) firstErrorMsg = 'SMTP sunucu ayarları (SMTP Host) tanımlanmamış';
    }
  }

  const approvedCount = summaryRows.filter(r => r.readingStatus === 'APPROVED').length;
  const pendingCount = summaryRows.filter(r => r.readingStatus === 'PENDING').length;
  const deniedCount = summaryRows.filter(r => r.readingStatus === 'DENIED').length;

  let emailDeliverySuccess = false;
  let emailDeliveryMessage = '';

  if (!smtpConfigured) {
    emailDeliverySuccess = false;
    emailDeliveryMessage = `E-posta gönderimi başarısız! SMTP sunucu ayarları (SMTP Host) tanımlanmamış. (${gasDate} gaz günü için ${stations.length} istasyon kontrol edildi: ${approvedCount} Onaylı, ${pendingCount} Bekleyen, ${deniedCount} Red)`;
  } else if (emailsSent === 0 && emailsFailed === 0) {
    emailDeliverySuccess = false;
    emailDeliveryMessage = `E-posta gönderimi başarısız! Gönderim yapılacak istasyonlar için tanımlı TO veya CC e-posta adresi bulunamadı.`;
  } else if (emailsFailed > 0 && emailsSent === 0) {
    emailDeliverySuccess = false;
    emailDeliveryMessage = `E-posta gönderimi başarısız! (${emailsFailed} adet gönderim hatası: ${firstErrorMsg})`;
  } else if (emailsFailed > 0 && emailsSent > 0) {
    emailDeliverySuccess = false;
    emailDeliveryMessage = `Kısmi E-posta Gönderimi: ${emailsSent} adet başarılı, ${emailsFailed} adet başarısız oldu (${firstErrorMsg}).`;
  } else {
    emailDeliverySuccess = true;
    emailDeliveryMessage = `E-posta gönderimi başarılı! Toplam ${emailsSent} adet rapor e-postası alıcılara başarıyla iletildi (${gasDate} gaz günü: ${approvedCount} Onaylı, ${pendingCount} Bekleyen, ${deniedCount} Red).`;
  }

  const logEntry = {
    runAt: new Date(),
    gasDate,
    triggerType,
    totalStations: stations.length,
    approvedCount,
    pendingCount,
    deniedCount,
    emailsSent,
    emailsFailed,
    emailDeliverySuccess,
    emailDeliveryMessage,
    smtpConfigured,
    stationDispatches
  };

  settings.lastRunAt = logEntry.runAt;
  settings.lastRunStatus = emailDeliverySuccess ? 'SUCCESS' : 'FAILED';
  settings.lastRunSummary = emailDeliveryMessage;
  settings.recentLogs = [logEntry, ...(settings.recentLogs || [])].slice(0, 15);
  await settings.save();

  return {
    success: true,
    emailDeliverySuccess,
    emailDeliveryMessage,
    gasDate,
    logEntry,
    settings
  };
}

async function sendSingleUserTestEmail(userId, targetGasDate = null) {
  const settings = await getOrCreateSettings();
  const user = await User.findById(userId).populate('assignedStation');
  if (!user) {
    return {
      emailDeliverySuccess: false,
      message: 'E-posta gönderimi başarısız: Kullanıcı bulunamadı.'
    };
  }

  const toEmails = (user.toEmails || []).filter(Boolean);
  const ccEmails = (user.ccEmails || []).filter(Boolean);

  if (toEmails.length === 0 && ccEmails.length === 0) {
    return {
      emailDeliverySuccess: false,
      message: `E-posta gönderimi başarısız! '${user.fullName}' için tanımlı TO veya CC e-posta adresi bulunmuyor. Lütfen önce "Mail / Düzenle" ile adres ekleyiniz.`
    };
  }

  const transporter = createTransporter(settings);
  if (!transporter) {
    return {
      emailDeliverySuccess: false,
      message: `E-posta gönderimi başarısız! SMTP sunucu ayarları (SMTP Host) tanımlanmamış. Lütfen SMTP Sunucu Ayarları bölümünü doldurup kaydediniz.`
    };
  }

  const gasDate = targetGasDate || (settings.checkTarget === 'TODAY' ? getTodayDateStr() : getYesterdayDateStr());
  let station = user.assignedStation;
  if (!station && user.stationU) {
    station = await Station.findOne({ u: user.stationU });
  }
  if (!station) {
    station = { name: user.fullName || 'Genel Yönetici', u: user.stationU || user.username };
  }

  const reading = await ensureStationReadingForDate(station, gasDate);
  const senderAddress = settings.fromEmail || settings.smtpUser || process.env.SMTP_FROM_EMAIL || 'noreply@gazalimtakip.local';
  const senderHeader = `"${settings.fromName || 'Gaz Alım Takip Sistemi'}" <${senderAddress}>`;

  const html = buildStationEmailHtml(station, reading, gasDate);
  const subject = `[Test - Gaz Alım Kontrol] ${station.name} (${gasDate})`;

  try {
    await transporter.sendMail({
      from: senderHeader,
      to: toEmails.length > 0 ? toEmails.join(', ') : ccEmails.join(', '),
      cc: toEmails.length > 0 && ccEmails.length > 0 ? ccEmails.join(', ') : undefined,
      subject,
      html
    });

    return {
      emailDeliverySuccess: true,
      message: `E-posta gönderimi başarılı! '${station.name}' (${gasDate} gaz günü) raporu TO: [${toEmails.join(', ') || '-'}] / CC: [${ccEmails.join(', ') || '-'}] adreslerine başarıyla iletildi.`
    };
  } catch (err) {
    return {
      emailDeliverySuccess: false,
      message: `E-posta gönderimi başarısız! SMTP Hatası: ${err.message}`
    };
  }
}

async function sendGeneralTestEmail(overrideSettings = {}) {
  const settings = await getOrCreateSettings();

  // Apply any unsaved settings from the form so user can test immediately
  if (overrideSettings && typeof overrideSettings === 'object') {
    if (Array.isArray(overrideSettings.adminToEmails)) {
      settings.adminToEmails = overrideSettings.adminToEmails.map(s => String(s).trim().toLowerCase()).filter(s => s.includes('@'));
    }
    if (Array.isArray(overrideSettings.adminCcEmails)) {
      settings.adminCcEmails = overrideSettings.adminCcEmails.map(s => String(s).trim().toLowerCase()).filter(s => s.includes('@'));
    }
    if (overrideSettings.smtpHost !== undefined) settings.smtpHost = String(overrideSettings.smtpHost).trim();
    if (overrideSettings.smtpPort !== undefined) settings.smtpPort = Number(overrideSettings.smtpPort) || 587;
    if (overrideSettings.smtpSecure !== undefined) settings.smtpSecure = Boolean(overrideSettings.smtpSecure);
    if (overrideSettings.smtpUser !== undefined) settings.smtpUser = String(overrideSettings.smtpUser).trim();
    if (overrideSettings.smtpPass !== undefined) settings.smtpPass = overrideSettings.smtpPass;
    if (overrideSettings.fromName !== undefined) settings.fromName = String(overrideSettings.fromName).trim();
    if (overrideSettings.fromEmail !== undefined) settings.fromEmail = String(overrideSettings.fromEmail).trim();
    await settings.save();
  }

  const globalTo = (settings.adminToEmails || []).filter(Boolean);
  const globalCc = (settings.adminCcEmails || []).filter(Boolean);

  if (globalTo.length === 0 && globalCc.length === 0) {
    return {
      emailDeliverySuccess: false,
      message: 'E-posta gönderimi başarısız! Genel TO veya Genel CC alanında tanımlı e-posta adresi bulunmuyor. Lütfen en az bir alıcı adresi ekleyiniz.',
      settings
    };
  }

  const transporter = createTransporter(settings);
  if (!transporter) {
    return {
      emailDeliverySuccess: false,
      message: 'E-posta gönderimi başarısız! Genel Mail Ayarları (SMTP Host) tanımlanmamış. Lütfen SMTP sunucu bilgilerini giriniz.',
      settings
    };
  }

  const gasDate =
    overrideSettings?.targetGasDate ||
    overrideSettings?.gasDate ||
    (settings.checkTarget === 'TODAY' ? getTodayDateStr() : getYesterdayDateStr());
  const stations = await Station.find({ isActive: true }).sort({ order: 1, name: 1 });
  for (const st of stations) {
    await ensureStationReadingForDate(st, gasDate);
  }
  const users = await User.find({ isActive: true });
  const readings = await GasReading.find({ gasDate });
  const readingMap = {};
  for (const r of readings) {
    readingMap[r.u] = r;
  }

  const summaryRows = stations.map((st) => {
    const r = readingMap[st.u] || null;
    const status = r && r.status ? r.status : 'PENDING';
    const hasReportFile = Boolean(r && r.files && r.files.length > 0);
    const stationUsers = users.filter(
      u => u.emailNotificationsEnabled !== false && (u.stationU === st.u || (u.assignedStation && String(u.assignedStation) === String(st._id)))
    );
    const toEmails = [...new Set(stationUsers.flatMap(u => u.toEmails || []))];
    const ccEmails = [...new Set(stationUsers.flatMap(u => u.ccEmails || []))];

    return {
      u: st.u,
      stationName: st.name,
      readingStatus: status,
      hasReportFile,
      consumption: r?.consumption ?? null,
      toEmails,
      ccEmails
    };
  });

  const senderAddress = settings.fromEmail || settings.smtpUser || process.env.SMTP_FROM_EMAIL || 'noreply@gazalimtakip.local';
  const senderHeader = `"${settings.fromName || 'Gaz Alım Takip Sistemi'}" <${senderAddress}>`;
  const summaryHtml = buildAdminSummaryHtml(gasDate, summaryRows);
  const summarySubject = `[Test - Genel Günlük Özet] Gaz Alım Onay Durum Raporu (${gasDate})`;

  try {
    await transporter.sendMail({
      from: senderHeader,
      to: globalTo.length > 0 ? globalTo.join(', ') : globalCc.join(', '),
      cc: globalTo.length > 0 && globalCc.length > 0 ? globalCc.join(', ') : undefined,
      subject: summarySubject,
      html: summaryHtml
    });

    return {
      emailDeliverySuccess: true,
      message: `E-posta gönderimi başarılı! (${gasDate} gaz günü) Genel test raporu Genel TO: [${globalTo.join(', ') || '-'}] / Genel CC: [${globalCc.join(', ') || '-'}] adreslerine başarıyla iletildi.`,
      settings
    };
  } catch (err) {
    return {
      emailDeliverySuccess: false,
      message: `E-posta gönderimi başarısız! SMTP Hatası: ${err.message}`,
      settings
    };
  }
}

async function initDailyCheckScheduler() {
  try {
    const settings = await getOrCreateSettings();

    if (scheduledTask) {
      scheduledTask.stop();
      scheduledTask = null;
    }

    if (!settings.enabled) {
      console.log('[DailyCheckScheduler] Günlük otomatik onay kontrolü pasif durumda.');
      return;
    }

    const [hourStr, minuteStr] = (settings.dailyRunTime || '09:30').split(':');
    const hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    const validHour = !isNaN(hour) && hour >= 0 && hour <= 23 ? hour : 9;
    const validMinute = !isNaN(minute) && minute >= 0 && minute <= 59 ? minute : 30;

    const cronExpr = `${validMinute} ${validHour} * * *`;

    scheduledTask = cron.schedule(
      cronExpr,
      async () => {
        console.log(`[DailyCheckScheduler] Günlük otomatik rapor onay kontrolü başlatılıyor (${settings.dailyRunTime})...`);
        try {
          await runDailyApprovalCheck({ triggerType: 'CRON' });
        } catch (err) {
          console.error('[DailyCheckScheduler] Hata:', err.message);
        }
      },
      {
        timezone: 'Europe/Istanbul'
      }
    );

    console.log(`[DailyCheckScheduler] Her gün saat ${String(validHour).padStart(2, '0')}:${String(validMinute).padStart(2, '0')} (Europe/Istanbul) için zamanlandı.`);
  } catch (error) {
    console.error('[DailyCheckScheduler] Başlatma hatası:', error.message);
  }
}

module.exports = {
  getOrCreateSettings,
  runDailyApprovalCheck,
  sendSingleUserTestEmail,
  sendGeneralTestEmail,
  initDailyCheckScheduler
};
