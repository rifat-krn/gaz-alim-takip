const User = require('../models/User');
const Station = require('../models/Station');
const {
  getOrCreateSettings,
  runDailyApprovalCheck,
  sendSingleUserTestEmail,
  sendGeneralTestEmail,
  initDailyCheckScheduler
} = require('../services/dailyReportCheckService');

const EMAIL_REGEX = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;

const normalizeEmails = (input) => {
  if (!input) return [];
  const rawList = Array.isArray(input)
    ? input.flatMap(item => String(item).split(/[,;\s\r\n]+/))
    : typeof input === 'string'
    ? input.split(/[,;\s\r\n]+/)
    : [];

  return [...new Set(
    rawList
      .map(e => e.trim().toLowerCase())
      .filter(e => EMAIL_REGEX.test(e))
  )];
};

exports.normalizeEmails = normalizeEmails;

// List all users
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().populate('assignedStation').select('-password').sort({ createdAt: -1 });
    res.json({ success: true, users });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Create new user
exports.createUser = async (req, res) => {
  try {
    const {
      username,
      password,
      fullName,
      role,
      isActive,
      assignedStation,
      stationU,
      toEmails,
      ccEmails,
      emailNotificationsEnabled
    } = req.body;

    if (!username || !password || !fullName) {
      return res.status(400).json({ success: false, message: 'Kullanıcı adı, şifre ve ad-soyad alanları zorunludur' });
    }

    const existing = await User.findOne({ username: username.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({ success: false, message: 'Bu kullanıcı adı zaten kullanılmaktadır' });
    }

    let finalStationU = stationU || '';
    if (assignedStation && !finalStationU) {
      const st = await Station.findById(assignedStation);
      if (st) finalStationU = st.u;
    }

    const user = new User({
      username: username.toLowerCase().trim(),
      password,
      fullName,
      role: role || 'station_operator',
      assignedStation: assignedStation || null,
      stationU: finalStationU,
      toEmails: normalizeEmails(toEmails),
      ccEmails: normalizeEmails(ccEmails),
      emailNotificationsEnabled: emailNotificationsEnabled !== undefined ? emailNotificationsEnabled : true,
      isActive: isActive !== undefined ? isActive : true
    });

    await user.save();

    const userResponse = await User.findById(user._id).populate('assignedStation').select('-password');
    res.status(201).json({ success: true, message: 'Kullanıcı başarıyla oluşturuldu', user: userResponse });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update user
exports.updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      username,
      fullName,
      role,
      isActive,
      password,
      assignedStation,
      stationU,
      toEmails,
      ccEmails,
      emailNotificationsEnabled
    } = req.body;

    const user = await User.findById(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    if (username && username.toLowerCase().trim() !== user.username) {
      const existing = await User.findOne({ username: username.toLowerCase().trim() });
      if (existing) {
        return res.status(400).json({ success: false, message: 'Bu kullanıcı adı başka bir kullanıcı tarafından kullanılıyor' });
      }
      user.username = username.toLowerCase().trim();
    }

    if (fullName) user.fullName = fullName;
    if (role) user.role = role;
    if (isActive !== undefined) user.isActive = isActive;
    if (assignedStation !== undefined) {
      user.assignedStation = assignedStation || null;
      if (assignedStation) {
        const st = await Station.findById(assignedStation);
        if (st) user.stationU = st.u;
      } else {
        user.stationU = '';
      }
    }
    if (stationU !== undefined) user.stationU = stationU;
    if (toEmails !== undefined) user.toEmails = normalizeEmails(toEmails);
    if (ccEmails !== undefined) user.ccEmails = normalizeEmails(ccEmails);
    if (emailNotificationsEnabled !== undefined) user.emailNotificationsEnabled = emailNotificationsEnabled;

    if (password && password.trim().length > 0) {
      user.password = password; // pre('save') hook will hash it
    }

    await user.save();

    const userResponse = await User.findById(user._id).populate('assignedStation').select('-password');
    res.json({ success: true, message: 'Kullanıcı ve mail bildirim bilgileri güncellendi', user: userResponse });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Delete user
exports.deleteUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user && req.user._id.toString() === id) {
      return res.status(400).json({ success: false, message: 'Kendinizi silemezsiniz' });
    }

    const user = await User.findByIdAndDelete(id);
    if (!user) {
      return res.status(404).json({ success: false, message: 'Kullanıcı bulunamadı' });
    }

    res.json({ success: true, message: 'Kullanıcı başarıyla silindi' });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Get Daily Report Check & Email Notification Settings
exports.getNotificationSettings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    res.json({ success: true, settings });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Update Daily Report Check & Email Notification Settings
exports.updateNotificationSettings = async (req, res) => {
  try {
    const settings = await getOrCreateSettings();
    const {
      enabled,
      dailyRunTime,
      checkTarget,
      sendMode,
      autoFetchBeforeCheck,
      adminToEmails,
      adminCcEmails,
      smtpHost,
      smtpPort,
      smtpSecure,
      smtpUser,
      smtpPass,
      fromName,
      fromEmail
    } = req.body;

    if (enabled !== undefined) settings.enabled = enabled;
    if (dailyRunTime !== undefined) settings.dailyRunTime = dailyRunTime;
    if (checkTarget !== undefined) settings.checkTarget = checkTarget;
    if (sendMode !== undefined) settings.sendMode = sendMode;
    if (autoFetchBeforeCheck !== undefined) settings.autoFetchBeforeCheck = autoFetchBeforeCheck;
    if (adminToEmails !== undefined) settings.adminToEmails = normalizeEmails(adminToEmails);
    if (adminCcEmails !== undefined) settings.adminCcEmails = normalizeEmails(adminCcEmails);
    if (smtpHost !== undefined) settings.smtpHost = smtpHost.trim();
    if (smtpPort !== undefined) settings.smtpPort = Number(smtpPort) || 587;
    if (smtpSecure !== undefined) settings.smtpSecure = Boolean(smtpSecure);
    if (smtpUser !== undefined) settings.smtpUser = smtpUser.trim();
    if (smtpPass !== undefined) settings.smtpPass = smtpPass;
    if (fromName !== undefined) settings.fromName = fromName.trim();
    if (fromEmail !== undefined) settings.fromEmail = fromEmail.trim();

    await settings.save();
    await initDailyCheckScheduler();

    res.json({
      success: true,
      message: `Günlük onay kontrol ve mail ayarları kaydedildi (Çalışma saati: ${settings.dailyRunTime})`,
      settings
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// Trigger Daily Report Check & Email Dispatch Now
exports.triggerDailyCheckNow = async (req, res) => {
  try {
    const { gasDate } = req.body || {};
    const result = await runDailyApprovalCheck({
      targetGasDate: gasDate || null,
      triggerType: 'MANUAL'
    });
    res.json({
      success: true,
      emailDeliverySuccess: result.emailDeliverySuccess,
      message: result.emailDeliveryMessage,
      logEntry: result.logEntry,
      settings: result.settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      emailDeliverySuccess: false,
      message: 'E-posta gönderimi başarısız! ' + error.message
    });
  }
};

// Send Test Email to a Specific User / Station's TO & CC list
exports.sendTestEmailForUser = async (req, res) => {
  try {
    const { id } = req.params;
    const result = await sendSingleUserTestEmail(id);
    res.json({
      success: true,
      emailDeliverySuccess: result.emailDeliverySuccess,
      message: result.message
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      emailDeliverySuccess: false,
      message: 'E-posta gönderimi başarısız! ' + error.message
    });
  }
};

// Send General Test Email to Global TO & Global CC using General Mail Settings
exports.sendTestEmailGeneral = async (req, res) => {
  try {
    const result = await sendGeneralTestEmail(req.body || {});
    res.json({
      success: true,
      emailDeliverySuccess: result.emailDeliverySuccess,
      message: result.message,
      settings: result.settings
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      emailDeliverySuccess: false,
      message: 'E-posta gönderimi başarısız! ' + error.message
    });
  }
};
