import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function EditStudentModal({ isOpen, onClose, onSave, student, groups }) {
  const [fullName, setFullName] = useState('');
  const [groupId, setGroupId] = useState('');
  const [loading, setLoading] = useState(false);

  // عندما يتغير الطالب المحدد، نقوم بتعبئة النموذج ببياناته
  useEffect(() => {
    if (student) {
      setFullName(student.full_name);
      setGroupId(student.group_id);
    }
  }, [student]);

  if (!isOpen || !student) return null;

  const handleSave = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { error } = await supabase
      .from('students')
      .update({ 
        full_name: fullName, 
        group_id: groupId 
      })
      .eq('id', student.id);
    
    setLoading(false);
    if (error) {
      alert("حدث خطأ أثناء تحديث بيانات الطالب: " + error.message);
    } else {
      alert("تم تحديث البيانات بنجاح.");
      onSave(); // لإعادة تحميل البيانات في لوحة التحكم
      onClose(); // لإغلاق النافذة
    }
  };

  return (
    <div className="modal-backdrop">
      <div className="modal-content">
        <h2>تعديل بيانات الطالب</h2>
        <form onSubmit={handleSave} style={{ marginTop: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <label htmlFor="edit-student-name">الاسم الكامل للطالب</label>
            <input
              id="edit-student-name"
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              style={{ marginTop: '0.5rem' }}
            />
          </div>
          <div>
            <label htmlFor="edit-student-group">المجموعة</label>
            <select
              id="edit-student-group"
              value={groupId}
              onChange={(e) => setGroupId(e.target.value)}
              required
              style={{ marginTop: '0.5rem' }}
            >
              {groups.map(g => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <div className="modal-actions">
            <button type="button" onClick={onClose} className="btn-secondary">إلغاء</button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? '...جاري الحفظ' : 'حفظ التغييرات'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}