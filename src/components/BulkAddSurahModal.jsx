import React, { useState } from 'react';

export default function BulkAddSurahModal({ isOpen, onClose, onSave, availableSurahs }) {
  const [selected, setSelected] = useState([]);

  if (!isOpen) return null;

  const handleCheckboxChange = (surahName) => {
    setSelected(prev =>
      prev.includes(surahName)
        ? prev.filter(s => s !== surahName)
        : [...prev, surahName]
    );
  };

  const handleSave = () => {
    onSave(selected);
    setSelected([]);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>إضافة سور كاملة دفعة واحدة</h2>
        <p>اختر السور التي أتم الطالب حفظها بالكامل. سيتم تجاهل أي سور محفوظة جزئيًا أو كليًا من قبل.</p>
        <div className="surah-checkbox-grid">
          {availableSurahs.map(surahName => (
            <div key={surahName} className="checkbox-item">
              <input
                type="checkbox"
                id={`surah-${surahName}`}
                checked={selected.includes(surahName)}
                onChange={() => handleCheckboxChange(surahName)}
              />
              <label htmlFor={`surah-${surahName}`}>{surahName}</label>
            </div>
          ))}
        </div>
        <div className="modal-actions">
          <button onClick={onClose} className="btn-secondary">إلغاء</button>
          <button onClick={handleSave} className="btn-primary">حفظ السور المحددة</button>
        </div>
      </div>
    </div>
  );
}