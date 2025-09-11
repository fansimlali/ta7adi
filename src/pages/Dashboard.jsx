import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';

// --- مكون العد التنازلي ---
function CountdownTimer({ targetDate }) {
  const calculateTimeLeft = () => {
    const difference = +new Date(targetDate) - +new Date();
    let timeLeft = {};

    if (difference > 0) {
      timeLeft = {
        أيام: Math.floor(difference / (1000 * 60 * 60 * 24)),
        ساعات: Math.floor((difference / (1000 * 60 * 60)) % 24),
        دقائق: Math.floor((difference / 1000 / 60) % 60),
        ثواني: Math.floor((difference / 1000) % 60),
      };
    }
    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setTimeout(() => {
      setTimeLeft(calculateTimeLeft());
    }, 1000);
    return () => clearTimeout(timer);
  });

  const timerComponents = [];
  Object.keys(timeLeft).forEach((interval) => {
    if (!timeLeft[interval] && timeLeft[interval] !== 0) {
      return;
    }
    timerComponents.push(
      <span key={interval}>
        <strong>{timeLeft[interval]}</strong> {interval}{' '}
      </span>
    );
  });

  return (
    <div className="countdown">
      <h3>العد التنازلي للموعد النهائي (15/07/2026)</h3>
      {timerComponents.length ? timerComponents : <span>انتهى الوقت!</span>}
    </div>
  );
}

// --- مكون لوحة التحكم الرئيسية ---
export default function Dashboard({ session, profile }) {
  const [loading, setLoading] = useState(true);
  const [groupDetails, setGroupDetails] = useState(null);
  const [groupMembers, setGroupMembers] = useState([]);
  
  // متغيرات نموذج إضافة الحفظ
  const [surahs, setSurahs] = useState([]);
  const [selectedSurah, setSelectedSurah] = useState('');
  const [versesCount, setVersesCount] = useState('');


  useEffect(() => {
    const fetchDashboardData = async () => {
      if (!profile || !profile.group_id) {
         setLoading(false);
         return;
      }
      setLoading(true);

      // 1. جلب تفاصيل المجموعة
      const { data: groupData, error: groupError } = await supabase
        .from('groups')
        .select('name, target_verses')
        .eq('id', profile.group_id)
        .single();

      if (groupError) console.error('Error fetching group details:', groupError);
      else setGroupDetails(groupData);

      // 2. جلب قائمة الطلاب في نفس المجموعة
      const { data: membersData, error: membersError } = await supabase
        .from('students')
        .select('id, full_name')
        .eq('group_id', profile.group_id);

      if (membersError) {
        console.error('Error fetching group members:', membersError);
        setLoading(false);
        return;
      }

      // 3. جلب سجلات الحفظ لكل طالب وحساب الإجمالي
      const membersWithProgress = await Promise.all(
        membersData.map(async (member) => {
          const { data: memorizedData, error: memorizedError } = await supabase
            .from('memorized_portions')
            .select('verses_memorized, updated_at')
            .eq('student_id', member.id);
          
          if (memorizedError) {
            console.error(`Error fetching memorized data for ${member.full_name}:`, memorizedError);
            return { ...member, totalMemorized: 0, percentage: 0, lastUpdate: null };
          }

          const totalMemorized = memorizedData.reduce((sum, record) => sum + record.verses_memorized, 0);
          const percentage = groupData ? ((totalMemorized / groupData.target_verses) * 100).toFixed(2) : 0;
          const lastUpdate = memorizedData.length > 0 ? new Date(Math.max(...memorizedData.map(e => new Date(e.updated_at)))).toLocaleDateString('ar-EG') : 'لا يوجد';

          return { ...member, totalMemorized, percentage, lastUpdate };
        })
      );
      
      setGroupMembers(membersWithProgress.sort((a, b) => b.percentage - a.percentage));
      
      // 4. جلب قائمة السور لنموذج الإضافة
      const { data: surahsData, error: surahsError } = await supabase.from('surahs').select('id, name').order('id');
      if (surahsError) console.error('Error fetching surahs:', surahsError);
      else setSurahs(surahsData);


      setLoading(false);
    };

    fetchDashboardData();
  }, [profile]);
  
  const handleAddMemorization = async (e) => {
      e.preventDefault();
      if (!selectedSurah || !versesCount || parseInt(versesCount) <= 0) {
          alert('يرجى اختيار السورة وإدخال عدد آيات صحيح.');
          return;
      }

      const { error } = await supabase.from('memorized_portions').insert({
          student_id: session.user.id,
          surah_id: parseInt(selectedSurah),
          verses_memorized: parseInt(versesCount)
      });
      
      if(error){
          alert('حدث خطأ: ' + error.message);
      } else {
          alert('تمت إضافة الحفظ بنجاح!');
          // إعادة تحميل الصفحة أو تحديث الحالة لعرض البيانات الجديدة
          window.location.reload(); 
      }
  };


  if (loading) {
    return <div>...جاري تحميل بيانات لوحة التحكم</div>;
  }

  return (
    <div className="dashboard-container">
      <header>
        <h2>أهلاً بك، {profile.full_name}!</h2>
        <button onClick={() => supabase.auth.signOut()}>تسجيل الخروج</button>
      </header>

      <CountdownTimer targetDate="2026-07-15T00:00:00" />
      
      <div className="main-content">
        <div className="group-info">
          <h3>مجموعتك: {groupDetails?.name}</h3>
          <p>الهدف: {groupDetails?.target_verses} آية</p>
          
          <div className="add-memorization-form">
            <h4>إضافة حفظ جديد</h4>
            <form onSubmit={handleAddMemorization}>
                <select value={selectedSurah} onChange={(e) => setSelectedSurah(e.target.value)} required>
                    <option value="">-- اختر السورة --</option>
                    {surahs.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                </select>
                <input 
                    type="number"
                    placeholder="عدد الآيات المحفوظة"
                    value={versesCount}
                    onChange={(e) => setVersesCount(e.target.value)}
                    required
                />
                <button type="submit">إضافة</button>
            </form>
          </div>
        </div>

        <div className="members-list">
          <h3>تقدم أفراد المجموعة</h3>
          <table>
            <thead>
              <tr>
                <th>الاسم</th>
                <th>نسبة الإنجاز</th>
                <th>آخر تحديث</th>
              </tr>
            </thead>
            <tbody>
              {groupMembers.map((member) => (
                <tr key={member.id}>
                  <td>{member.full_name}</td>
                  <td>
                    <div className="progress-bar-container">
                        <div className="progress-bar" style={{width: `${member.percentage}%`}}></div>
                        <span>{member.percentage}%</span>
                    </div>
                  </td>
                  <td>{member.lastUpdate}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}