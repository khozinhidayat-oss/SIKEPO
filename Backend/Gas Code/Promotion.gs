/**
 * Promotion.gs - Class Promotion & Academic Year Transition Services (Object Module Pattern)
 * Strictly synchronized with Master Setting Sistem (Single Source of Truth)
 */

var Promotion = {
  getNextAcademicYear: function(currentYear) {
    if (!currentYear) return '2027/2028';
    var parts = String(currentYear).split('/');
    if (parts.length === 2) {
      var y1 = parseInt(parts[0], 10) + 1;
      var y2 = parseInt(parts[1], 10) + 1;
      if (!isNaN(y1) && !isNaN(y2)) {
        return y1 + '/' + y2;
      }
    }
    return '2027/2028';
  },

  getPreview: function(oldYearParam, newYearParam) {
    try {
      // Single Source of Truth: Fetch Master Setting Sistem
      var settings = Setting.get();
      var activeOldYear = settings.academicYear || '2026/2027';
      var activeNewYear = Promotion.getNextAcademicYear(activeOldYear);

      var students = Student.getAll() || [];
      var classes = Class.getAll() || [];

      var countReady = 0;
      var countGraduated = 0;
      var countAlumni = 0;

      var previewItems = students.map(function(s) {
        var sId = String(s.id || '').trim();
        var sNis = String(s.nis || '').trim();
        var sName = String(s.name || s.nama || '').trim();
        var sMajor = String(s.majorName || s.major || s.jurusan || '').trim();
        var currentClass = String(s.className || s.class || s.kelas || '').trim();
        var currentLevel = String(s.level || s.tingkat || (currentClass.startsWith('XII') ? 'XII' : currentClass.startsWith('XI') ? 'XI' : 'X')).trim();
        
        var targetLevel = '';
        var targetClass = '';
        var status = 'Siap Diproses';
        var statusNote = '';

        if (s.status === 'Alumni' || currentLevel === 'Lulus') {
          status = 'Sudah Alumni';
          statusNote = 'Siswa sudah berstatus Alumni';
          countAlumni++;
          return {
            id: sId,
            studentId: sId,
            nis: sNis,
            name: sName,
            majorName: sMajor,
            oldAcademicYear: activeOldYear,
            newAcademicYear: activeNewYear,
            oldLevel: currentLevel,
            newLevel: 'Lulus',
            oldClassName: currentClass,
            newClassName: 'ALUMNI',
            status: status,
            statusNote: statusNote
          };
        }

        if (currentLevel === 'X') {
          targetLevel = 'XI';
          targetClass = currentClass.replace(/^X\b/i, 'XI');
          statusNote = 'Pindah dari Kelas ' + currentClass + ' ke ' + targetClass;
          countReady++;
        } else if (currentLevel === 'XI') {
          targetLevel = 'XII';
          targetClass = currentClass.replace(/^XI\b/i, 'XII');
          statusNote = 'Pindah dari Kelas ' + currentClass + ' ke ' + targetClass;
          countReady++;
        } else if (currentLevel === 'XII') {
          targetLevel = 'Lulus';
          targetClass = 'ALUMNI';
          status = 'Siap Lulus';
          statusNote = 'Siswa Kelas XII akan diluluskan menjadi Alumni';
          countGraduated++;
        } else {
          targetLevel = currentLevel;
          targetClass = currentClass;
          statusNote = 'Tetap pada kelas ' + currentClass;
        }

        return {
          id: sId,
          studentId: sId,
          nis: sNis,
          name: sName,
          majorName: sMajor,
          oldAcademicYear: activeOldYear,
          newAcademicYear: activeNewYear,
          oldLevel: currentLevel,
          newLevel: targetLevel,
          oldClassName: currentClass,
          newClassName: targetClass,
          status: status,
          statusNote: statusNote
        };
      });

      return {
        success: true,
        oldYear: activeOldYear,
        newYear: activeNewYear,
        academicYear: activeOldYear,
        nextAcademicYear: activeNewYear,
        semester: settings.semester || 'Ganjil',
        totalStudents: previewItems.length,
        totalClasses: classes.length,
        countReady: countReady,
        countGraduated: countGraduated,
        countAlumni: countAlumni,
        items: previewItems,
        data: previewItems
      };
    } catch (err) {
      console.error('Error in Promotion.getPreview:', err);
      return { success: false, message: 'Gagal memuat pratinjau kenaikan kelas: ' + err.message, items: [], data: [] };
    }
  },

  execute: function(previewItemsParam, oldYearParam, newYearParam, processedBy) {
    try {
      var session = Auth.getCurrentUserSession();

      // Enforce Master Setting Sistem for Active Academic Year
      var settings = Setting.get();
      var activeOldYear = settings.academicYear || '2026/2027';
      var activeNewYear = Promotion.getNextAcademicYear(activeOldYear);

      var students = Student.getAll() || [];
      var itemsToProcess = previewItemsParam;

      if (!Array.isArray(itemsToProcess) || itemsToProcess.length === 0) {
        var previewRes = Promotion.getPreview(activeOldYear, activeNewYear);
        itemsToProcess = previewRes.items || [];
      }

      if (itemsToProcess.length === 0) {
        return { success: false, message: 'Tidak ada data siswa yang siap diproses untuk kenaikan kelas.' };
      }

      var batchId = 'BATCH-PROMOTION-' + Date.now();
      var nowIso = new Date().toISOString();
      var dateStr = nowIso.split('T')[0];
      var timeStr = new Date().toTimeString().split(' ')[0].substring(0, 5);

      var totalPromoted = 0;
      var totalGraduated = 0;
      var totalProcessed = 0;

      for (var i = 0; i < itemsToProcess.length; i++) {
        var item = itemsToProcess[i];
        if (item.status === 'Sudah Alumni') continue;

        if (item.id && item.newClassName) {
          var isGraduating = item.status === 'Siap Lulus' || item.newClassName === 'ALUMNI' || item.newLevel === 'Lulus';
          
          var updateRecord = {
            kelas: item.newClassName,
            tingkat: isGraduating ? 'Lulus' : item.newLevel,
            status: isGraduating ? 'Alumni' : 'Aktif',
            updated_at: nowIso
          };

          Database.updateRow('siswa', item.id, updateRecord);
          totalProcessed++;

          if (isGraduating) {
            totalGraduated++;
          } else {
            totalPromoted++;
          }

          // Record individual history log
          var historyRecord = {
            id: 'prm-' + Date.now() + '-' + i,
            batchId: batchId,
            nis: item.nis || '',
            studentName: item.name || item.studentName || '',
            oldAcademicYear: activeOldYear,
            newAcademicYear: activeNewYear,
            oldLevel: item.oldLevel || '',
            newLevel: item.newLevel || '',
            oldClassName: item.oldClassName || '',
            newClassName: item.newClassName || '',
            processedBy: processedBy || (session ? session.name : 'Admin'),
            date: dateStr,
            time: timeStr,
            timestamp: nowIso,
            status: isGraduating ? 'Lulus' : 'Naik Kelas'
          };
          Database.insertRow('promotion_history', historyRecord);
        }
      }

      // CRITICAL STEP: Update Master Setting Sistem to target academic year
      Setting.save({
        academicYear: activeNewYear,
        semester: 'Ganjil'
      });

      // System Log Activity
      Database.logActivity(
        processedBy || (session ? session.name : 'Admin'),
        (session ? session.role : 'admin'),
        'KENAIKAN_KELAS_MASSAL',
        'Memproses kenaikan kelas massal dari ' + activeOldYear + ' ke ' + activeNewYear + ' (' + totalPromoted + ' naik kelas, ' + totalGraduated + ' lulus).'
      );

      return {
        success: true,
        message: 'Kenaikan kelas massal berhasil diproses! Master Setting Sistem telah diperbarui ke Tahun Ajaran ' + activeNewYear + '.',
        data: {
          batchId: batchId,
          oldAcademicYear: activeOldYear,
          newAcademicYear: activeNewYear,
          totalProcessed: totalProcessed,
          totalPromoted: totalPromoted,
          totalGraduated: totalGraduated
        }
      };
    } catch (err) {
      console.error('Error in Promotion.execute:', err);
      return { success: false, message: 'Gagal memproses kenaikan kelas: ' + err.message };
    }
  },

  rollback: function(userName, userRole) {
    try {
      var histories = Database.getTableData('promotion_history') || [];
      if (histories.length === 0) {
        return { success: false, message: 'Tidak ada riwayat kenaikan kelas yang dapat dibatalkan.' };
      }

      // Find latest batchId that is not rolled back
      var activeHistories = histories.filter(function(h) {
        return h.status !== 'Rollback';
      });

      if (activeHistories.length === 0) {
        return { success: false, message: 'Tidak ditemukan batch kenaikan kelas aktif untuk di-rollback.' };
      }

      // Sort descending by timestamp
      activeHistories.sort(function(a, b) {
        return (b.timestamp || '').localeCompare(a.timestamp || '');
      });

      var targetBatchId = activeHistories[0].batchId || activeHistories[0].batch_id;
      var batchItems = activeHistories.filter(function(h) {
        return (h.batchId || h.batch_id) === targetBatchId;
      });

      var rolledBackCount = 0;
      var targetOldYear = batchItems[0] ? (batchItems[0].oldAcademicYear || batchItems[0].old_academic_year || '2026/2027') : '2026/2027';

      var nowIso = new Date().toISOString();

      for (var i = 0; i < batchItems.length; i++) {
        var item = batchItems[i];
        var nis = item.nis || item.NIS;
        if (nis) {
          var students = Student.getAll() || [];
          var matchedS = students.find(function(s) { return String(s.nis).trim() === String(nis).trim(); });
          if (matchedS) {
            Database.updateRow('siswa', matchedS.id, {
              kelas: item.oldClassName || item.old_class_name,
              tingkat: item.oldLevel || item.old_level || 'X',
              status: 'Aktif',
              updated_at: nowIso
            });
            rolledBackCount++;
          }
        }
        // Mark history item as Rollback
        if (item.id) {
          Database.updateRow('promotion_history', item.id, { status: 'Rollback', updated_at: nowIso });
        }
      }

      // Revert Master Setting Sistem academic year back to targetOldYear
      Setting.save({
        academicYear: targetOldYear
      });

      Database.logActivity(
        userName || 'Admin',
        userRole || 'admin',
        'ROLLBACK_KENAIKAN_KELAS',
        'Membatalkan (rollback) kenaikan kelas batch ' + targetBatchId + ' untuk ' + rolledBackCount + ' siswa. Tahun Ajaran dikembalikan ke ' + targetOldYear + '.'
      );

      return {
        success: true,
        message: 'Rollback kenaikan kelas batch ' + targetBatchId + ' berhasil! Data ' + rolledBackCount + ' siswa dan Master Setting Sistem dikembalikan ke Tahun Ajaran ' + targetOldYear + '.',
        rolledBackCount: rolledBackCount,
        revertedAcademicYear: targetOldYear
      };
    } catch (err) {
      console.error('Error in Promotion.rollback:', err);
      return { success: false, message: 'Gagal melakukan rollback kenaikan kelas: ' + err.message };
    }
  },

  getHistory: function() {
    try {
      var histories = Database.getTableData('promotion_history') || [];
      return {
        success: true,
        data: histories.map(function(h) {
          return {
            id: h.id || 'prm-' + Math.random(),
            batchId: h.batchId || h.batch_id || '',
            nis: h.nis || h.NIS || '',
            studentName: h.studentName || h.nama_siswa || '',
            oldAcademicYear: h.oldAcademicYear || h.old_academic_year || '',
            newAcademicYear: h.newAcademicYear || h.new_academic_year || '',
            oldLevel: h.oldLevel || h.old_level || '',
            newLevel: h.newLevel || h.new_level || '',
            oldClassName: h.oldClassName || h.old_class_name || '',
            newClassName: h.newClassName || h.new_class_name || '',
            processedBy: h.processedBy || h.processed_by || 'Admin',
            date: h.date || h.tanggal || '',
            time: h.time || h.waktu || '',
            timestamp: h.timestamp || h.created_at || '',
            status: h.status || 'Naik Kelas'
          };
        })
      };
    } catch (err) {
      return { success: true, data: [] };
    }
  }
};

// Global RPC & Legacy Aliases
function getPromotionPreview(oldYear, newYear) {
  return Promotion.getPreview(oldYear, newYear);
}

function executePromotion(previewItems, oldYear, newYear, processedBy) {
  return Promotion.execute(previewItems, oldYear, newYear, processedBy);
}

function rollbackPromotion(userName, userRole) {
  return Promotion.rollback(userName, userRole);
}

function getActiveAcademicYear() {
  var settings = Setting.get();
  return {
    success: true,
    academicYear: settings.academicYear || '2026/2027',
    semester: settings.semester || 'Ganjil'
  };
}

