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
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingRecord, setEditingRecord] = useState(null);

  // Form state
  const [selectedSurahName, setSelectedSurahName] = useState(surahData[0].name);
  const [startVerse, setStartVerse] = useState('');
  const [endVerse, setEndVerse] = useState('');
  const [isCompleteSurah, setIsCompleteSurah] = useState(false);
  const [recordedAt, setRecordedAt] = useState(new Date().toISOString().split('T')[0]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    const { data: studentData, error: studentError } = await supabase
      .from('students')
      .select('*, groups(*)')
      .eq('id', studentId)
      .single();

    if (studentError) console.error("Error fetching student:", studentError);
    setStudent(studentData);

    const { data: recordsData, error: recordsError } = await supabase
      .from('memorized_portions')
      .select('*, surahs(name)')
      .eq('student_id', studentId)
      .order('recorded_at', { ascending: false });

    if (recordsError) console.error("Error fetching records:", recordsError);
    setRecords(recordsData || []);
    setLoading(false);
  }, [studentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // ======== (بداية التعديل: إعداد قوائم الآيات) ========
  const selectedSurahInfo = useMemo(() => {
    return surahData.find(s => s.name === selectedSurahName);
  }, [selectedSurahName]);

  const startVerseOptions = useMemo(() => {
    if (!selectedSurahInfo) return [];
    return Array.from({ length: selectedSurahInfo.verse_count }, (_, i) => i + 1);
  }, [selectedSurahInfo]);

  const endVerseOptions = useMemo(() => {
    if (!selectedSurahInfo || !startVerse) return [];
    const startNum = parseInt(startVerse);
    // القائمة تبدأ من آية البداية نفسها
    return Array.from({ length: selectedSurahInfo.verse_count - startNum + 1 }, (_, i) => startNum + i);
  }, [selectedSurahInfo, startVerse]);

  // عند تغيير السورة، قم بإعادة تعيين الآيات
  const handleSurahChange = (newSurahName) => {
    setSelectedSurahName(newSurahName);
    setStartVerse('');
    setEndVerse('');
    setIsCompleteSurah(false);
  };
  
  // عند تغيير آية البداية، أعد تعيين آية النهاية
  const handleStartVerseChange = (newStartVerse) => {
    setStartVerse(newStartVerse);
    setEndVerse(''); 
  };
  // ======== (نهاية التعديل) ========
  
  const checkVerseOverlap = useCallback((surahName, newStart, newEnd, recordIdToIgnore = null) => {
    const existingRecordsForSurah = records.filter(r => r.surahs.name === surahName && r.id !== recordIdToIgnore);
    for (const record of existingRecordsForSurah) {
      if (newStart <= record.end_verse && newEnd >= record.start_verse) {
        return true;
      }
    }
    return false;
  }, [records]);

  const handleAddRecord = async (e) => {
    e.preventDefault();
    if (!startVerse || !endVerse) return alert('الرجاء اختيار آية البداية والنهاية.');
    const newStartVerse = parseInt(startVerse);
    const newEndVerse = parseInt(endVerse);
    const surahInfo = surahData.find(s => s.name === selectedSurahName);
    if (!surahInfo) return alert('لم يتم العثور على معلومات السورة.');
    
    if (checkVerseOverlap(selectedSurahName, newStartVerse, newEndVerse)) {
      return alert('خطأ: المقطع الذي أدخلته يتداخل مع مقطع آخر محفوظ مسبقًا في نفس السورة.');
    }
    const verseCount = newEndVerse - newStartVerse + 1;
    const { error } = await supabase.from('memorized_portions').insert({
      student_id: studentId,
      surah_id: surahInfo.id,
      start_verse: newStartVerse,
      end_verse: newEndVerse,
      verses_memorized: verseCount,
      recorded_at: new Date(recordedAt).toISOString(),
    });
    if (error) {
      alert("حدث خطأ أثناء إضافة السجل: " + error.message);
    } else {
      alert("تمت إضافة الحفظ بنجاح!");
      fetchData();
      setStartVerse('');
      setEndVerse('');
      setIsCompleteSurah(false);
    }
  };
  
  const handleBulkAdd = async (selectedSurahNames) => {
    if (selectedSurahNames.length === 0) return alert('لم تختر أي سور.');
    const recordsToInsert = [];
    for (const surahName of selectedSurahNames) {
      const surahInfo = surahData.find(s => s.name === surahName);
      if (!surahInfo) continue;
      if (checkVerseOverlap(surahName, 1, surahInfo.verse_count)) {
          alert(`سورة "${surahName}" تحتوي على مقاطع محفوظة مسبقًا، سيتم تجاهلها.`);
          continue;
      }
      recordsToInsert.push({
        student_id: studentId,
        surah_id: surahInfo.id,
        start_verse: 1,
        end_verse: surahInfo.verse_count,
        verses_memorized: surahInfo.verse_count,
        recorded_at: new Date(recordedAt).toISOString(),
      });
    }
    if (recordsToInsert.length === 0) return;
    const { error } = await supabase.from('memorized_portions').insert(recordsToInsert);
    if (error) {
      alert('حدث خطأ أثناء إضافة السور: ' + error.message);
    } else {
      alert(`تمت إضافة ${recordsToInsert.length} سورة بنجاح!`);
      fetchData();
    }
  };
  
  const handleDeleteRecord = async (recordId) => {
    if (window.confirm("هل أنت متأكد من حذف هذا السجل؟")) {
      const { error } = await supabase.from('memorized_portions').delete().eq('id', recordId);
      if (error) {
        alert("خطأ في الحذف: " + error.message);
      } else {
        alert("تم الحذف بنجاح.");
        fetchData();
      }
    }
  };

  const handleUpdateRecord = async (updatedRecord) => {
    const { surahs, ...recordToUpdate } = updatedRecord; 
    const { error } = await supabase
      .from('memorized_portions')
      .update(recordToUpdate)
      .eq('id', recordToUpdate.id);
      
    if (error) {
      alert("خطأ في التعديل: " + error.message);
    } else {
      alert("تم التعديل بنجاح.");
      setEditingRecord(null);
      fetchData();
    }
  };

  const handleCompleteSurahToggle = (checked) => {
    setIsCompleteSurah(checked);
    const surahInfo = surahData.find(s => s.name === selectedSurahName);
    if (checked && surahInfo) {
      setStartVerse('1');
      setEndVerse(surahInfo.verse_count.toString());
    } else {
      setStartVerse('');
      setEndVerse('');
    }
  };

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

  const availableSurahsForBulkAdd = useMemo(() => {
    return surahData
      .filter(s => surahStatusMap[s.name]?.status !== 'completed')
      .map(s => s.name);
  }, [surahStatusMap]);
  
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
        {/* ======== (بداية التعديل على النموذج) ======== */}
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
        {/* ======== (نهاية التعديل على النموذج) ======== */}
        <div className="form-options">
          <div className="checkbox-item">
            <input type="checkbox" id="completeSurah" checked={isCompleteSurah} onChange={(e) => handleCompleteSurahToggle(e.target.checked)} />
            <label htmlFor="completeSurah">السورة كاملة</label>
          </div>
          <button onClick={() => setIsModalOpen(true)} className="btn-success">إضافة سور دفعة واحدة</button>
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
                          <tr>
                            <th>السورة</th>
                            <th>من - إلى</th>
                            <th>التاريخ</th>
                            <th>الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {groupedRecords[year][month].records.map(record => (
                            <tr key={record.id}>
                              <td>{record.surahs.name}</td>
                              <td>{record.start_verse} - {record.end_verse}</td>
                              <td>{new Date(record.recorded_at).toLocaleDateString('ar-EG')}</td>
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
        ) : (
          <p style={{textAlign: 'center', padding: '1rem'}}>لا توجد سجلات حفظ لهذا الطالب بعد.</p>
        )}
      </div>

      <div className="admin-section card">
        <h3>خريطة الحفظ</h3>
        <div className="surah-map-grid">
          {surahData.map(surah => {
            const statusInfo = surahStatusMap[surah.name] || { status: 'not-started', memorizedVerses: 0, totalVerses: surah.verse_count };
            return (
              <div key={surah.name} className={`surah-tile ${statusInfo.status}`}>
                <span>{surah.name}</span>
                <small>
                  {statusInfo.status === 'completed' && 'مكتملة'}
                  {statusInfo.status === 'in-progress' && `${statusInfo.memorizedVerses} / ${statusInfo.totalVerses}`}
                  {statusInfo.status === 'not-started' && 'لم تبدأ'}
                </small>
                {statusInfo.status !== 'not-started' && (
                    <div className="progress-bar-container"><div className="progress-bar-fill" style={{width: `${(statusInfo.memorizedVerses / statusInfo.totalVerses) * 100}%`}}></div></div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      <EditRecordModal 
        isOpen={!!editingRecord}
        onClose={() => setEditingRecord(null)}
        onSave={handleUpdateRecord}
        record={editingRecord}
      />
      
      <BulkAddSurahModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleBulkAdd}
        availableSurahs={availableSurahsForBulkAdd}
      />
    </div>
  );
}