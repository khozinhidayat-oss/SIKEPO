/**
 * Report.gs - Reports & Discipline Status Backend Services (Object Module Pattern)
 */

var Report = {
  getDisciplineRule: function(points) {
    var p = Math.max(0, Number(points) || 0);
    if (p <= 19) {
      return { status: 'Baik', warningLevel: 'Peringatan Lisan Pertama', followUp: 'Terdokumentasi.' };
    } else if (p <= 29) {
      return { status: 'Perlu Pembinaan', warningLevel: 'Peringatan Lisan Kedua', followUp: 'Terdokumentasi.' };
    } else if (p <= 39) {
      return { status: 'Perlu Pembinaan', warningLevel: 'Peringatan Tertulis Pertama', followUp: 'Orang tua dan wali kelas diberi tembusan. Orang tua dipanggil ke sekolah.' };
    } else if (p <= 49) {
      return { status: 'Pembinaan Intensif', warningLevel: 'Peringatan Tertulis Kedua', followUp: 'Orang tua, wali kelas, dan Kaprog diberi tembusan. Orang tua dipanggil ke sekolah.' };
    } else if (p <= 59) {
      return { status: 'Pembinaan Intensif', warningLevel: 'Peringatan Tertulis Ketiga', followUp: 'Orang tua, wali kelas, Kaprog, dan Kesiswaan diberi tembusan.' };
    } else if (p <= 69) {
      return { status: 'Pengawasan Khusus', warningLevel: 'Peringatan Keras Tertulis Pertama', followUp: 'Orang tua, wali kelas, Kaprog, dan Kesiswaan diberi tembusan.' };
    } else if (p <= 79) {
      return { status: 'Pengawasan Khusus', warningLevel: 'Peringatan Keras Tertulis Kedua', followUp: 'Pemanggilan Orang Tua oleh Kepala Sekolah & Kesiswaan.' };
    } else if (p <= 99) {
      return { status: 'Sangat Berat', warningLevel: 'Peringatan Keras Tertulis Ketiga', followUp: 'Konferensi kasus dan skorsing sementara.' };
    } else {
      return { status: 'Dikembalikan kepada Orang Tua', warningLevel: 'Dikembalikan kepada Orang Tua', followUp: 'Dikembalikan kepada Orang Tua/Wali.' };
    }
  },

  getPointSummaries: function() {
    try {
      var students = Student.getAll() || [];
      var transactions = Violation.getAll() || [];

      var summaryMap = {};
      students.forEach(function(s) {
        var sId = String(s.id || '').trim();
        var sNis = String(s.nis || '').trim();
        var sName = String(s.name || s.nama || '').trim();
        var sClass = String(s.className || s.class || s.kelas || '').trim();
        var sMajor = String(s.majorName || s.major || s.jurusan || '').trim();
        var sLevel = String(s.level || s.tingkat || (sClass.startsWith('XII') ? 'XII' : sClass.startsWith('XI') ? 'XI' : 'X')).trim();
        var sGender = String(s.gender || s.jenisKelamin || 'L').trim();

        summaryMap[sId || sNis] = {
          id: sId || sNis,
          studentId: sId,
          studentName: sName,
          name: sName,
          nis: sNis,
          nisn: String(s.nisn || '').trim(),
          class: sClass,
          className: sClass,
          major: sMajor,
          majorName: sMajor,
          level: sLevel,
          tingkat: sLevel,
          gender: sGender,
          totalPoints: 0,
          totalPelanggaran: 0,
          netPoints: 0,
          totalViolationsCount: 0,
          lastViolationDate: '-',
          disciplineStatus: 'Baik',
          warningLevel: 'Peringatan Lisan Pertama',
          followUpAction: 'Terdokumentasi.'
        };
      });

      transactions.forEach(function(t) {
        if (t.type && t.type !== 'pelanggaran') return;
        var tStudentId = String(t.studentId || t.id_siswa || '').trim().toLowerCase();
        var tStudentNis = String(t.studentNis || t.nis || '').trim().toLowerCase();
        var tStudentName = String(t.studentName || t.nama_siswa || t.nama || '').trim().toLowerCase();
        var pts = Number(t.points !== undefined ? t.points : (t.poin !== undefined ? t.poin : 0));

        var matchedKey = null;
        for (var k in summaryMap) {
          var item = summaryMap[k];
          var kId = String(item.studentId || '').trim().toLowerCase();
          var kNis = String(item.nis || '').trim().toLowerCase();
          var kName = String(item.studentName || '').trim().toLowerCase();

          if (
            (kId && (kId === tStudentId || kId === tStudentNis)) ||
            (kNis && (kNis === tStudentId || kNis === tStudentNis)) ||
            (kName && tStudentName && kName === tStudentName)
          ) {
            matchedKey = k;
            break;
          }
        }

        if (matchedKey && summaryMap[matchedKey]) {
          summaryMap[matchedKey].totalPoints += pts;
          summaryMap[matchedKey].totalPelanggaran += pts;
          summaryMap[matchedKey].netPoints += pts;
          summaryMap[matchedKey].totalViolationsCount += 1;
          var tDate = String(t.date || t.tanggal || '');
          if (tDate && (summaryMap[matchedKey].lastViolationDate === '-' || tDate > summaryMap[matchedKey].lastViolationDate)) {
            summaryMap[matchedKey].lastViolationDate = tDate;
          }
        }
      });

      var resultList = [];
      for (var key in summaryMap) {
        var sObj = summaryMap[key];
        var rule = Report.getDisciplineRule(sObj.totalPoints);
        sObj.disciplineStatus = rule.status;
        sObj.warningLevel = rule.warningLevel;
        sObj.followUpAction = rule.followUp;
        resultList.push(sObj);
      }

      return resultList;
    } catch (err) {
      console.error('Error in Report.getPointSummaries:', err);
      return [];
    }
  },

  generatePointReport: function(startDate, endDate, classFilter) {
    try {
      var transactions = Violation.getAll() || [];
      var result = transactions.filter(function(t) {
        if (startDate && t.date < startDate) return false;
        if (endDate && t.date > endDate) return false;
        if (classFilter && classFilter !== 'all' && t.class !== classFilter) return false;
        return true;
      });
      return { success: true, data: result, totalCount: result.length };
    } catch (err) {
      console.error('Error in Report.generatePointReport:', err);
      return { success: false, message: err.message, data: [] };
    }
  },

  exportReportExcel: function(reportData) {
    try {
      var session = Auth.getCurrentUserSession();
      var count = reportData ? reportData.length : 0;
      Database.logActivity(session ? session.name : 'System', session ? session.role : 'kesiswaan', 'EXPORT_LAPORAN', 'Mengunduh laporan sejumlah ' + count + ' baris');
      return { success: true, count: count };
    } catch (err) {
      return { success: false, message: err.message };
    }
  },

  updateDisciplineStatus: function(studentId, newStatus, userName, userRole) {
    try {
      if (!studentId || !newStatus) {
        return { success: false, message: 'ID siswa dan status baru wajib diisi.' };
      }

      var record = {
        id: studentId,
        discipline_status: newStatus,
        updated_at: new Date().toISOString()
      };

      Database.updateRow('siswa', studentId, record);
      Database.logActivity(userName || 'Admin', userRole || 'admin', 'UPDATE_DISCIPLINE_STATUS', 'Siswa ID: ' + studentId + ' diubah status kedisiplinan menjadi: ' + newStatus);

      return { success: true, message: 'Status kedisiplinan berhasil diperbarui.' };
    } catch (err) {
      console.error('Error in Report.updateDisciplineStatus:', err);
      return { success: false, message: 'Gagal memperbarui status kedisiplinan: ' + err.message };
    }
  }
};

// Global legacy aliases
function generatePointReport(startDate, endDate, classFilter) {
  return Report.generatePointReport(startDate, endDate, classFilter);
}

function exportReportExcel(reportData) {
  return Report.exportReportExcel(reportData);
}
