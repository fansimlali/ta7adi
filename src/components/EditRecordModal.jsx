import React, { useState, useEffect } from 'react';
import { surahData } from '../surahData';

export default function EditRecordModal({ isOpen, onClose, onSave, record }) {
  const [surahId, setSurahId] = useState('');
  const [startVerse, setStartVerse] = useState('');
  const [endVerse, setEndVerse] = useState('');
  const [recordedAt, setRecordedAt] = useState('');

  useEffect(() => {
    if (record) {
      const surahInfo = surahData.find(s => s.name === record.surahs.name);
      setSurahId(surahInfo ? surahInfo.id : '');
      setStartVerse(record.start_verse);
      setEndVerse(record.end_verse);
      setRecordedAt(new Date(record.recorded_at).toISOString().split('T')[0]);
    }
  }, [record]);

  if (!isOpen || !record) return null;

  const handleSave = () => {
    const updatedRecord = {
      ...record,
      surah_id: parseInt(surahId),
      start_verse: parseInt(startVerse),
      end_verse: parseInt(endVerse),
      verses_memorized: parseInt(endVerse) - parseInt(startVerse) + 1,
      recorded_at: new Date(recordedAt).toISOString(),
    };
    onSave(updatedRecord);
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>تعديل سجل الحفظ</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '1.5rem' }}>
          <div>
            <label>السورة</label>
            <select value={surahId} onChange={(e) => setSurahId(e.target.value)} style={{width: '100%', margin: '0.5rem 0 0 0'}}>
              {surahData.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div style={{ display: 'flex', gap: '1rem' }}>
            <div><label>من الآية</label><input type="number" value={startVerse} onChange={(e) => setStartVerse(e.target.value)} /></div>
            <div><label>إلى الآية</label><input type="number" value={endVerse} onChange={(e) => setEndVerse(e.target.value)} /></div>
          </div>
          <div>
            <label>تاريخ الحفظ</label>
            <input type="date" value={recordedAt} onChange={(e) => setRecordedAt(e.target.value)} />
          </div>
        </div>
        <div className="modal-actions">
          <button onClick={onClose} className="btn-secondary">إلغاء</button>
          <button onClick={handleSave} className="btn-primary">حفظ التغييرات</button>
        </div>
      </div>
    </div>
  );
}