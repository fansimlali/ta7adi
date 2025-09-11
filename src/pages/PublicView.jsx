import React, { useState, useEffect, useMemo } from 'react';
import { supabase } from '../supabaseClient';
import { Link } from 'react-router-dom';

const ADMIN_UID = 'db907f6a-cf81-4169-8271-d062fa56e093';

function formatDate(dateString) {
  if (!dateString) return null;
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

function CountdownTimer({ targetDate, startDate }) {
  const calculateTimeLeft = () => {
    const difference = +new Date(targetDate) - +new Date();
    let timeLeft = {};
    if (difference > 0) {
      timeLeft = {
        أيام: Math.floor(difference / (1000 * 60 * 60 * 24)),
        ساعات: Math.floor((difference / (1000 * 60 * 60)) % 24),
        دقائق: Math.floor((difference / 1000 / 60) % 60),
      };
    }
    return timeLeft;
  };

  const [timeLeft, setTimeLeft] = useState(calculateTimeLeft());

  useEffect(() => {
    const timer = setTimeout(() => setTimeLeft(calculateTimeLeft()), 1000);
    return () => clearTimeout(timer);
  });

  const timerComponents = Object.keys(timeLeft).map((interval) => (
    <span key={interval}><strong>{timeLeft[interval]}</strong> {interval}</span>
  ));

  return (
    <div className="countdown card">
      <h3>العد التنازلي (من {startDate} إلى {targetDate.substring(0, 10).split('-').reverse().join('/')})</h3>
      {timerComponents.length ? timerComponents : <span>انتهى الوقت!</span>}
    </div>
  );
}

export default function PublicView({ session }) {
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [studentsProgress, setStudentsProgress] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState('');

  useEffect(() => {
    const fetchGroups = async () => {
      const { data, error } = await supabase.from('groups').select('*');
      if (error) console.error('Error fetching groups', error);
      else {
        setGroups(data);
        if (data.length > 0) setSelectedGroup(data[0].id);
      }
    };
    fetchGroups();
  }, []);

  useEffect(() => {
    const fetchStudentsProgress = async () => {
      if (!selectedGroup || groups.length === 0) return;
      setLoading(true);
      const currentGroup = groups.find(g => g.id.toString() === selectedGroup.toString());
      if (!currentGroup) { setLoading(false); return; }
      
      const { data: studentsData, error } = await supabase.rpc('get_students_progress_by_group', { p_group_id: selectedGroup });
      if (error) {
        console.error('Error fetching students progress:', error);
        setStudentsProgress([]);
      } else {
        const calculatedProgress = studentsData.map(student => {
          const totalMemorized = student.total_verses_memorized || 0;
          const targetVerses = currentGroup.target_verses || 1;
          const remainingVerses = Math.max(0, targetVerses - totalMemorized);
          const percentage = ((totalMemorized / targetVerses) * 100).toFixed(1);
          return { ...student, total_memorized: totalMemorized, remaining_verses: remainingVerses, percentage: percentage };
        });
        calculatedProgress.sort((a, b) => b.percentage - a.percentage);
        setStudentsProgress(calculatedProgress);
      }
      setLoading(false);
    };
    fetchStudentsProgress();
  }, [selectedGroup, groups]);

  // ======== (بداية الإضافة: حسابات التقدم الإجمالي للمجموعة) ========
  const groupProgress = useMemo(() => {
    if (!selectedGroup || groups.length === 0 || studentsProgress.length === 0) {
      return { totalMemorized: 0, totalTarget: 0, percentage: 0 };
    }
    const currentGroup = groups.find(g => g.id.toString() === selectedGroup.toString());
    if (!currentGroup) return { totalMemorized: 0, totalTarget: 0, percentage: 0 };

    // الهدف الإجمالي هو هدف المجموعة مضروبًا في عدد الطلاب
    const totalTarget = currentGroup.target_verses * studentsProgress.length;
    // المجموع المحفوظ هو مجموع ما حفظه كل الطلاب
    const totalMemorized = studentsProgress.reduce((sum, student) => sum + student.total_memorized, 0);
    // النسبة المئوية للإنجاز
    const percentage = totalTarget > 0 ? ((totalMemorized / totalTarget) * 100).toFixed(1) : 0;

    return { totalMemorized, totalTarget, percentage };
  }, [studentsProgress, selectedGroup, groups]);
  // ======== (نهاية الإضافة) ========

  return (
    <div className="container">
      <div className="header">
        <h1>تقدم الطلاب في حفظ القرآن</h1>
        {session && session.user.id === ADMIN_UID ? (
          <Link to="/admin" className="btn btn-primary">الانتقال للوحة التحكم</Link>
        ) : (
          <Link to="/login" className="btn btn-secondary">دخول المحفّظ</Link>
        )}
      </div>

      <CountdownTimer startDate="10/09/2025" targetDate="2026-07-15T00:00:00" />
      
      <div className="card filters">
        <h3>اختر المجموعة لعرض بياناتها:</h3>
        <select value={selectedGroup} onChange={(e) => setSelectedGroup(e.target.value)}>
          {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="card"><p>...جاري تحميل البيانات</p></div>
      ) : (
        <div className="card">
          {/* ======== (بداية الإضافة: عرض شريط تقدم المجموعة) ======== */}
          <div className="group-progress-section">
            <h4>التقدم الإجمالي للمجموعة</h4>
            <div className="progress-cell">
              <div className="progress-bar-shell">
                <div className="progress-bar-fill" style={{ width: `${groupProgress.percentage}%` }}></div>
              </div>
              <span className="percentage-text">{groupProgress.percentage}%</span>
            </div>
            <div className="group-stats-details">
              <span>المجموع المحفوظ: <strong className="stat-number">{groupProgress.totalMemorized}</strong></span>
              <span>الهدف الإجمالي للمجموعة: <strong className="stat-number">{groupProgress.totalTarget}</strong></span>
            </div>
          </div>
          {/* ======== (نهاية الإضافة) ======== */}

          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>الرتبة</th>
                  <th>الطالب</th>
                  <th style={{minWidth: '300px'}}>نسبة الإنجاز وآخر تحديث</th>
                  <th>المحفوظ</th>
                  <th>المتبقي</th>
                </tr>
              </thead>
              <tbody>
                {studentsProgress.length > 0 ? studentsProgress.map((student, index) => (
                  <tr key={student.id}>
                    <td><span className="rank-circle">{index + 1}</span></td>
                    <td>{student.full_name}</td>
                    <td>
                      <div className="progress-cell">
                        <div className="progress-bar-shell">
                          <div className="progress-bar-fill" style={{ width: `${student.percentage}%` }}></div>
                        </div>
                        <span className="percentage-text">{student.percentage}%</span>
                      </div>
                      {student.last_recorded_at && (
                        <div className="last-update-info">
                          آخر حفظ: {student.last_surah_name} ({student.last_start_verse}-{student.last_end_verse}) بتاريخ {formatDate(student.last_recorded_at)}
                        </div>
                      )}
                    </td>
                    <td><strong className="stat-number">{student.total_memorized}</strong></td>
                    <td><strong className="stat-number">{student.remaining_verses}</strong></td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="5" style={{textAlign: 'center'}}>لا يوجد طلاب في هذه المجموعة بعد.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}