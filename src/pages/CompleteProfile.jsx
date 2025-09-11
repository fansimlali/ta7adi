import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

export default function CompleteProfile({ session, onProfileComplete }) {
  const [loading, setLoading] = useState(false);
  const [fullName, setFullName] = useState('');
  const [groupId, setGroupId] = useState('');
  const [groups, setGroups] = useState([]);

  // جلب قائمة المجموعات المتاحة من قاعدة البيانات
  useEffect(() => {
    const getGroups = async () => {
      const { data, error } = await supabase.from('groups').select('id, name');
      if (error) {
        console.error('Error fetching groups:', error);
      } else {
        setGroups(data);
        // تحديد المجموعة الأولى كقيمة افتراضية
        if (data.length > 0) {
          setGroupId(data[0].id);
        }
      }
    };
    getGroups();
  }, []);

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    const { user } = session;

    // --- تم حذف السطر الخاطئ من هنا ---
    const { error } = await supabase.from('students').insert({
      id: user.id,
      full_name: fullName,
      group_id: groupId,
    });

    if (error) {
      alert('حدث خطأ أثناء تحديث البيانات: ' + error.message);
    } else {
      alert('تم إنشاء الملف الشخصي بنجاح!');
      onProfileComplete(); // لإعلام App.jsx بإعادة تحميل البيانات
    }
    setLoading(false);
  };

  return (
    <div className="form-container">
      <h2>إكمال الملف الشخصي</h2>
      <p>أهلاً بك! يرجى إدخال اسمك الكامل واختيار مجموعتك للمتابعة.</p>
      <form onSubmit={handleProfileUpdate}>
        <div>
          <label htmlFor="email">البريد الإلكتروني</label>
          <input id="email" type="text" value={session.user.email} disabled />
        </div>
        <div>
          <label htmlFor="fullName">الاسم الكامل</label>
          <input
            id="fullName"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>
        <div>
          <label htmlFor="group">اختر مجموعتك</label>
          <select
            id="group"
            value={groupId}
            onChange={(e) => setGroupId(e.target.value)}
            required
          >
            {groups.map((group) => (
              <option key={group.id} value={group.id}>
                {group.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <button type="submit" disabled={loading}>
            {loading ? '...جاري الحفظ' : 'حفظ ومتابعة'}
          </button>
        </div>
      </form>
    </div>
  );
}