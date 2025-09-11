import React, { useState } from 'react';

// تمت إضافة خصائص جديدة: title, actionButtonText, actionButtonClass
export default function BulkAddSurahModal({ isOpen, onClose, onSave, availableSurahs, title, actionButtonText, actionButtonClass }) {
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
    // التأكد من وجود سور محددة قبل الحفظ
    if (selected.length === 0) {
      alert("الرجاء اختيار سورة واحدة على الأقل.");
      return;
    }
    onSave(selected);
    setSelected([]);
    onClose();
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        {/* استخدام العنوان الديناميكي */}
        <h2>{title}</h2>
        <div className="surah-checkbox-grid">
          {availableSurahs.length > 0 ? (
            availableSurahs.map(surahName => (
              <div key={surahName} className="checkbox-item">
                <input
                  type="checkbox"
                  id={`surah-${surahName}`}
                  checked={selected.includes(surahName)}
                  onChange={() => handleCheckboxChange(surahName)}
                />
                <label htmlFor={`surah-${surahName}`}>{surahName}</label>
              </div>
            ))
          ) : (
            <p>لا توجد سور متاحة لهذه العملية.</p>
          )}
        </div>
        <div className="modal-actions">
          <button onClick={onClose} className="btn-secondary">إلغاء</button>
          {/* استخدام نص ولون الزر الديناميكي */}
          <button onClick={handleSave} className={actionButtonClass}>
            {actionButtonText}
          </button>
        </div>
      </div>
    </div>
  );
}