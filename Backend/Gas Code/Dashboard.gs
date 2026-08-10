/**
 * Dashboard.gs - Analytics & Statistics Data Supplier (Object Module Pattern)
 */

var Dashboard = {
  getMetrics: function() {
    try {
      ensureUsersTable();
      var students = Student.getAll() || [];
      var transactions = Violation.getAll() || [];
      var settings = Setting.get() || { pointThreshold: 75 };

      var today = new Date().toISOString().split('T')[0];
      var totalPelanggaranCount = transactions.length;
      var todayPelanggaran = 0;

      var studentPointsMap = {};
      students.forEach(function(s) {
        if (s && s.id) studentPointsMap[s.id] = 0;
      });

      transactions.forEach(function(t) {
        if (!t) return;
        var p = Number(t.points) || 0;
        var tDate = String(t.date || '').split('T')[0];

        if (tDate === today) todayPelanggaran++;

        var sId = t.studentId || t.nis;
        if (sId) {
          studentPointsMap[sId] = (studentPointsMap[sId] || 0) + p;
        }
      });

      var exceedCount = 0;
      var threshold = Number(settings.pointThreshold) || 75;
      Object.keys(studentPointsMap).forEach(function(sId) {
        if (studentPointsMap[sId] >= threshold) {
          exceedCount++;
        }
      });

      var session = Auth.getCurrentUserSession();

      return {
        success: true,
        totalStudents: students.length,
        totalPelanggaranCount: totalPelanggaranCount,
        todayPelanggaran: todayPelanggaran,
        exceedThresholdCount: exceedCount,
        userRole: session ? session.role : 'admin',
        userName: session ? session.name : 'Administrator'
      };
    } catch (err) {
      console.error('Error in Dashboard.getMetrics:', err);
      return {
        success: false,
        message: err.message || 'Gagal memuat statistik dashboard.',
        totalStudents: 0,
        totalPelanggaranCount: 0,
        todayPelanggaran: 0,
        exceedThresholdCount: 0,
        userRole: 'admin',
        userName: 'Administrator'
      };
    }
  }
};

function getDashboardMetrics() {
  return Dashboard.getMetrics();
}
