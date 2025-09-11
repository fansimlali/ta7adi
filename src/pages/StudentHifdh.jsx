import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { surahData } from '../surahData';
import BulkAddSurahModal from '../components/BulkAddSurahModal';
import EditRecordModal from '../components/EditRecordModal';

export default function StudentHifdh() {
  const { studentId } = useParams();
  const [student, setStudent] = useState(null);
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingRecord, setEditingRecord] = useState(null);

  // Form state
  const [selectedSurahName, setSelectedSurahName] = useState(surahData[0].name);
  const [startVerse, setStartVerse] = useState('');
  const [endVerse, setEndVerse] = useState('');
  const [isCompleteSurah, setIsCompleteSurah] = useState(false);
  const [recordedAt, setRecordedAt] = useState(new Date().toISOString().split('T')[0]);

  // ======== (بداية الإضافة الجديدة) ========
  const [isBulkAddModalOpen, setIsBulkAddModalOpen] = useState(false);
  const [isBulkDeleteModalOpen, setIsBulkDeleteModalOpen] = useState(false);
  // ======== (نهاية الإضافة الجديدة) ========

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: studentData } = await supabase.from('students').select('*, groups(*)').eq('id', studentId).single();
    setStudent(studentData);
    const { data: recordsData } = await supabase.from('memorized_portions').select('*, surahs(name)').eq('student_id', studentId).order('recorded_at', { ascending: false });
    setRecords(recordsData || []);
    setLoading(false);
  }, [studentId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const surahStatusMap = useMemo(() => {
    const statusMap = {};
    const versesBySurah = {};
    records.forEach(r => {
      if (!versesBySurah[r.surahs.name]) versesBySurah[r.surahs.name] = 0;
      versesBySurah[r.surahs.name] += r.verses_memorized;
    });
    surahData.forEach(surah => {
      const memorizedCount = versesBySurah[surah.name] || 0;
      let status = 'not-started';
      if (memorizedCount > 0) status = memorizedCount >= surah.verse_count ? 'completed' : 'in-progress';
      statusMap[surah.name] = { status, memorizedVerses: memorizedCount, totalVerses: surah.verse_count };
    });
    return statusMap;
  }, [records]);

  const handleAddRecord = async (e) => {
    e.preventDefault();
    if (!startVerse || !endVerse) return alert('الرجاء اختيار آية البداية والنهاية.');
    const newStartVerse = parseInt(startVerse);
    const newEndVerse = parseInt(endVerse);
    const surahInfo = surahData.find(s => s.name === selectedSurahName);
    if (!surahInfo) return;
    const { error } = await supabase.from('memorized_portions').insert({
      student_id: studentId, surah_id: surahInfo.id, start_verse: newStartVerse,
      end_verse: newEndVerse, verses_memorized: newEndVerse - newStartVerse + 1,
      recorded_at: new Date(recordedAt).toISOString(),
    });
    if (error) { alert("حدث خطأ: " + error.message); }
    else { alert("تمت الإضافة بنجاح!"); fetchData(); setStartVerse(''); setEndVerse(''); setIsCompleteSurah(false); }
  };

  const handleBulkAdd = async (selectedSurahNames) => {
    const recordsToInsert = [];
    for (const surahName of selectedSurahNames) {
      const surahInfo = surahData.find(s => s.name === surahName);
      if (surahInfo && surahStatusMap[surahName]?.status !== 'completed') {
        recordsToInsert.push({
          student_id: studentId, surah_id: surahInfo.id, start_verse: 1,
          end_verse: surahInfo.verse_count, verses_memorized: surahInfo.verse_count,
          recorded_at: new Date(recordedAt).toISOString(),
        });
      }
    }
    if (recordsToInsert.length === 0) return;
    const { error } = await supabase.from('memorized_portions').insert(recordsToInsert);
    if (error) { alert('حدث خطأ: ' + error.message); }
    else { alert(`تمت إضافة ${recordsToInsert.length} سورة بنجاح!`); fetchData(); }
  };

  // ======== (بداية الإضافة الجديدة: دالة الحذف الجماعي) ========
  const handleBulkDelete = async (selectedSurahNames) => {
    if (!window.confirm(`هل أنت متأكد من حذف كل سجلات الحفظ المتعلقة بـ ${selectedSurahNames.length} سورة؟ لا يمكن التراجع عن هذا الإجراء.`)) {
      return;
    }

    // الحصول على IDs السور المراد حذفها
    const surahIdsToDelete = surahData
      .filter(s => selectedSurahNames.includes(s.name))
      .map(s => s.id);

    if (surahIdsToDelete.length === 0) return;

    // تنفيذ الحذف من قاعدة البيانات
    const { error } = await supabase
      .from('memorized_portions')
      .delete()
      .eq('student_id', studentId)
      .in('surah_id', surahIdsToDelete);

    if (error) {
      alert("حدث خطأ أثناء الحذف: " + error.message);
    } else {
      alert(`تم حذف سجلات ${selectedSurahNames.length} سورة بنجاح.`);
      fetchData();
    }
  };
  // ======== (نهاية الإضافة الجديدة) ========

  const handleDeleteRecord = async (recordId) => {
    if (window.confirm("هل أنت متأكد من حذف هذا السجل؟")) {
      const { error } = await supabase.from('memorized_portions').delete().eq('id', recordId);
      if (error) { alert("خطأ في الحذف: " + error.message); }
      else { alert("تم الحذف بنجاح."); fetchData(); }
    }
  };

  const handleUpdateRecord = async (updatedRecord) => {
    const { surahs, ...recordToUpdate } = updatedRecord;
    const { error } = await supabase.from('memorized_portions').update(recordToUpdate).eq('id', recordToUpdate.id);
    if (error) { alert("خطأ في التعديل: " + error.message); }
    else { alert("تم التعديل بنجاح."); setEditingRecord(null); fetchData(); }
  };

  const selectedSurahInfo = useMemo(() => surahData.find(s => s.name === selectedSurahName), [selectedSurahName]);
  const startVerseOptions = useMemo(() => selectedSurahInfo ? Array.from({ length: selectedSurahInfo.verse_count }, (_, i) => i + 1) : [], [selectedSurahInfo]);
  const endVerseOptions = useMemo(() => (selectedSurahInfo && startVerse) ? Array.from({ length: selectedSurahInfo.verse_count - parseInt(startVerse) + 1 }, (_, i) => parseInt(startVerse) + i) : [], [selectedSurahInfo, startVerse]);
  const handleSurahChange = (name) => { setSelectedSurahName(name); setStartVerse(''); setEndVerse(''); setIsCompleteSurah(false); };
  const handleStartVerseChange = (verse) => { setStartVerse(verse); setEndVerse(''); };
  const handleCompleteSurahToggle = (checked) => {
    setIsCompleteSurah(checked);
    if (checked && selectedSurahInfo) { setStartVerse('1'); setEndVerse(selectedSurahInfo.verse_count.toString()); }
    else { setStartVerse(''); setEndVerse(''); }
  };
  
  const groupedRecords = useMemo(() => {
    const monthNames = ["", "يناير", "فبراير", "مارس", "أبريل", "مايو", "يونيو", "يوليو", "أغسطس", "سبتمبر", "أكتوبر", "نوفمبر", "ديسمبر"];
    const groups = {};
    records.forEach(record => {
      const date = new Date(record.recorded_at);
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const monthName = monthNames[month];
      if (!groups[year]) groups[year] = {};
      if (!groups[year][month]) groups[year][month] = { name: monthName, records: [] };
      groups[year][month].records.push(record);
    });
    return groups;
  }, [records]);

  const availableSurahsForBulkAdd = useMemo(() => surahData.filter(s => surahStatusMap[s.name]?.status !== 'completed').map(s => s.name), [surahStatusMap]);
  const availableSurahsForBulkDelete = useMemo(() => surahData.filter(s => surahStatusMap[s.name]?.status === 'completed').map(s => s.name), [surahStatusMap]);

  if (loading) return <div>...جاري تحميل بيانات الطالب</div>;
  if (!student) return <div>لم يتم العثور على الطالب. <Link to="/admin" className="btn btn-secondary">العودة</Link></div>;
  
  return (
    <div className="admin-dashboard">
      <div className="header">
        <h1>إدارة حفظ: {student.full_name}</h1>
        <Link to="/admin" className="btn btn-primary">عرض كل الطلاب</Link>
      </div>

      <div className="admin-section card">
        <h3>إضافة مقطع محفوظ جديد</h3>
        <form onSubmit={handleAddRecord} className="form-grid">
          <select value={selectedSurahName} onChange={(e) => handleSurahChange(e.target.value)}>
            {surahData.map((s) => (<option key={s.name} value={s.name}>{s.name}</option>))}
          </select>
          <select value={startVerse} onChange={(e) => handleStartVerseChange(e.target.value)} disabled={isCompleteSurah}>
            <option value="" disabled>من الآية</option>
            {startVerseOptions.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <select value={endVerse} onChange={(e) => setEndVerse(e.target.value)} disabled={isCompleteSurah || !startVerse}>
            <option value="" disabled>إلى الآية</option>
            {endVerseOptions.map(v => <option key={v} value={v}>{v}</option>)}
          </select>
          <input type="date" value={recordedAt} onChange={(e) => setRecordedAt(e.target.value)} />
          <button type="submit" className="btn-primary">إضافة</button>
        </form>
        <div className="form-options">
          <div className="checkbox-item">
            <input type="checkbox" id="completeSurah" checked={isCompleteSurah} onChange={(e) => handleCompleteSurahToggle(e.target.checked)} />
            <label htmlFor="completeSurah">السورة كاملة</label>
          </div>
          <div style={{display: 'flex', gap: '1rem'}}>
            <button onClick={() => setIsBulkAddModalOpen(true)} className="btn-success">إضافة سور دفعة واحدة</button>
            {/* ======== (بداية الإضافة الجديدة: زر الحذف الجماعي) ======== */}
            <button onClick={() => setIsBulkDeleteModalOpen(true)} className="btn-danger">حذف سور دفعة واحدة</button>
            {/* ======== (نهاية الإضافة الجديدة) ======== */}
          </div>
        </div>
      </div>

      <div className="admin-section card">
        <h3>سجل الحفظ ({records.length} سجل)</h3>
        {records.length > 0 ? (
          <div className="records-accordion">
            {Object.keys(groupedRecords).sort((a, b) => b - a).map(year => (
              <details key={year} className="year-group" open={String(year) === String(new Date().getFullYear())}>
                <summary>عام {year}</summary>
                {Object.keys(groupedRecords[year]).sort((a, b) => b - a).map(month => (
                  <details key={`${year}-${month}`} className="month-group" open={String(month) === String(new Date().getMonth() + 1)}>
                    <summary>{groupedRecords[year][month].name}</summary>
                    <div className="table-wrapper">
                      <table>
                        <thead>
                          <tr><th>السورة</th><th>من - إلى</th><th>التاريخ</th><th>الإجراءات</th></tr>
                        </thead>
                        <tbody>
                          {groupedRecords[year][month].records.map(record => (
                            <tr key={record.id}>
                              <td>{record.surahs.name}</td>
                              <td>{record.start_verse} - {record.end_verse}</td>
                              <td>{formatDate(record.recorded_at)}</td>
                              <td>
                                <div style={{display: 'flex', gap: '0.5rem'}}>
                                  <button onClick={() => setEditingRecord(record)} className="btn-secondary" style={{padding: '0.5em 1em'}}>تعديل</button>
                                  <button onClick={() => handleDeleteRecord(record.id)} className="btn-danger" style={{padding: '0.5em 1em'}}>حذف</button>
                                </div>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </details>
                ))}
              </details>
            ))}
          </div>
        ) : (<p style={{textAlign: 'center', padding: '1rem'}}>لا توجد سجلات حفظ.</p>)}
      </div>

      <div className="admin-section card">
        <h3>خريطة الحفظ</h3>
        <div className="surah-map-grid">{surahData.map(surah => { const statusInfo = surahStatusMap[surah.name]; return (<div key={surah.name} className={`surah-tile ${statusInfo.status}`}><span>{surah.name}</span><small>{statusInfo.status === 'completed' ? 'مكتملة' : `${statusInfo.memorizedVerses} / ${statusInfo.totalVerses}`}</small>{statusInfo.status !== 'not-started' && (<div className="progress-bar-container"><div className="progress-bar-fill" style={{width: `${(statusInfo.memorizedVerses / statusInfo.totalVerses) * 100}%`}}></div></div>)}</div>);})}</div>
      </div>
      
      <EditRecordModal isOpen={!!editingRecord} onClose={() => setEditingRecord(null)} onSave={handleUpdateRecord} record={editingRecord} />
      
      {/* ======== (بداية التعديل: استدعاء النافذة المنبثقة للإضافة والحذف) ======== */}
      <BulkAddSurahModal 
        isOpen={isBulkAddModalOpen}
        onClose={() => setIsBulkAddModalOpen(false)}
        onSave={handleBulkAdd}
        availableSurahs={availableSurahsForBulkAdd}
        title="إضافة سور مكتملة (حفظ)"
        actionButtonText="حفظ السور المحددة"
        actionButtonClass="btn-success"
      />
      <BulkAddSurahModal 
        isOpen={isBulkDeleteModalOpen}
        onClose={() => setIsBulkDeleteModalOpen(false)}
        onSave={handleBulkDelete}
        availableSurahs={availableSurahsForBulkDelete}
        title="حذف سور مكتملة"
        actionButtonText="حذف السور المحددة"
        actionButtonClass="btn-danger"
      />
      {/* ======== (نهاية التعديل) ======== */}
    </div>
  );
}

// دالة تنسيق التاريخ خارج المكون الرئيسي
function formatDate(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}