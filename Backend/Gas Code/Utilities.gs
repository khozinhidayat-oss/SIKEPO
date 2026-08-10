/**
 * Utilities.gs - General Utility & Helper Functions
 */

function formatDateIndo(dateStr) {
  if (!dateStr) return '-';
  try {
    var parts = dateStr.split('-');
    if (parts.length === 3) {
      return parts[2] + '/' + parts[1] + '/' + parts[0];
    }
  } catch(e) {}
  return dateStr;
}

function generateUuid() {
  return Utilities.getUuid();
}
