const mongoose = require('mongoose');

const notificationSettingSchema = new mongoose.Schema({
  key: {
    type: String,
    default: 'DAILY_REPORT_CHECK',
    unique: true
  },
  enabled: {
    type: Boolean,
    default: true
  },
  dailyRunTime: {
    type: String,
    default: '09:30' // HH:mm format (günde 1 kez çalışacak saat)
  },
  checkTarget: {
    type: String,
    enum: ['YESTERDAY', 'TODAY'],
    default: 'YESTERDAY'
  },
  sendMode: {
    type: String,
    enum: ['ALL', 'UNAPPROVED_ONLY'],
    default: 'ALL'
  },
  autoFetchBeforeCheck: {
    type: Boolean,
    default: true
  },
  adminToEmails: {
    type: [String],
    default: []
  },
  adminCcEmails: {
    type: [String],
    default: []
  },
  smtpHost: {
    type: String,
    default: process.env.SMTP_HOST || ''
  },
  smtpPort: {
    type: Number,
    default: Number(process.env.SMTP_PORT) || 587
  },
  smtpSecure: {
    type: Boolean,
    default: process.env.SMTP_SECURE === 'true'
  },
  smtpUser: {
    type: String,
    default: process.env.SMTP_USER || ''
  },
  smtpPass: {
    type: String,
    default: process.env.SMTP_PASS || ''
  },
  fromName: {
    type: String,
    default: process.env.SMTP_FROM_NAME || 'Gaz Alım Takip Sistemi'
  },
  fromEmail: {
    type: String,
    default: process.env.SMTP_FROM_EMAIL || ''
  },
  lastRunAt: {
    type: Date,
    default: null
  },
  lastRunStatus: {
    type: String,
    default: ''
  },
  lastRunSummary: {
    type: String,
    default: ''
  },
  recentLogs: [
    {
      runAt: { type: Date, default: Date.now },
      gasDate: String,
      triggerType: String, // 'CRON' or 'MANUAL'
      totalStations: Number,
      approvedCount: Number,
      pendingCount: Number,
      deniedCount: Number,
      emailsSent: Number,
      emailsFailed: Number,
      emailDeliverySuccess: Boolean,
      emailDeliveryMessage: String,
      smtpConfigured: Boolean,
      stationDispatches: [
        {
          stationName: String,
          u: String,
          readingStatus: String,
          hasReportFile: Boolean,
          toEmails: [String],
          ccEmails: [String],
          deliveryStatus: String,
          message: String
        }
      ]
    }
  ]
}, {
  timestamps: true
});

module.exports = mongoose.model('NotificationSetting', notificationSettingSchema);
