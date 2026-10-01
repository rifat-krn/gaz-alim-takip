/**
 * Helper to calculate Gas Day (Gaz Günü) and date parameters dt, dt2, dt3
 * 
 * Rules:
 * Gas day is the day previous starts from 08:00 and ends the day we are in at 08:00.
 * For example, if target date / today is 2026-10-01:
 * - Gas Day string: 2026-09-30
 * - dt: 2026-09-30 08:00:00 (Start of gas day)
 * - dt2: 2026-09-30 08:00:00 (Start of gas day)
 * - dt3: 2026-09-01 08:00:00 (Start of the month 08:00:00 for RMSA queries)
 * - dtEnd: 2026-10-01 08:00:00 (End of gas day)
 */

function padZero(num) {
  return String(num).padStart(2, '0');
}

function formatDateISO(date) {
  const y = date.getFullYear();
  const m = padZero(date.getMonth() + 1);
  const d = padZero(date.getDate());
  return `${y}-${m}-${d}`;
}

function formatDateTurkish(date) {
  const y = date.getFullYear();
  const m = padZero(date.getMonth() + 1);
  const d = padZero(date.getDate());
  return `${d}.${m}.${y}`;
}

function getGasDayInfo(targetDateStr = null) {
  let gasDayDate;
  
  if (targetDateStr) {
    const parts = targetDateStr.split('-');
    if (parts.length === 3) {
      gasDayDate = new Date(parseInt(parts[0]), parseInt(parts[1]) - 1, parseInt(parts[2]));
    }
  }

  if (!gasDayDate) {
    const today = new Date();
    gasDayDate = new Date(today);
    gasDayDate.setDate(today.getDate() - 1);
  }

  const nextDay = new Date(gasDayDate);
  nextDay.setDate(gasDayDate.getDate() + 1);

  const monthFirstDay = new Date(gasDayDate.getFullYear(), gasDayDate.getMonth(), 1);

  const gasDayStr = formatDateISO(gasDayDate);
  const nextDayStr = formatDateISO(nextDay);
  const monthFirstDayStr = formatDateISO(monthFirstDay);

  return {
    gasDate: gasDayStr, // YYYY-MM-DD
    gasDateFormattedTR: formatDateTurkish(gasDayDate),
    dt: `${gasDayStr} 08:00:00`,
    dt1: `${gasDayStr} 08:00:00`,
    dt2: `${gasDayStr} 08:00:00`,
    dt3: `${monthFirstDayStr} 08:00:00`,
    dtEnd: `${nextDayStr} 08:00:00`,
    dt1_tr: `${formatDateTurkish(gasDayDate)} 08:00:00`,
    dt2_tr: `${formatDateTurkish(gasDayDate)} 08:00:00`,
    dt3_tr: `${formatDateTurkish(monthFirstDay)} 08:00:00`,
    startDate: gasDayDate,
    endDate: nextDay
  };
}

module.exports = {
  getGasDayInfo,
  formatDateISO,
  formatDateTurkish
};
