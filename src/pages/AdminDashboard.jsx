import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import EditStudentModal from '../components/EditStudentModal';

function StudentCard({ student, onDataChange, onEdit }) {
  const navigate = useNavigate();

  // حسابات التقدم
  const totalMemorized = student.total_memorized || 0;
  const targetVerses = student.target_verses || 1; // Avoid division by zero
  const remainingVerses = Math.max(0, targetVerses - totalMemorized);
  const percentage = ((totalMemorized / targetVerses) * 100).toFixed(1);

  const handleDeleteStudent = async () => {
    if (window.confirm(`هل أنت متأكد من حذف الطالب "${student.full_name}" وكل سجلاته؟`)) {
        const { error } = await supabase.from('students').delete().eq('id', student.id);
        if (error) alert('حدث خطأ: ' + error.message);
        else { alert("تم حذف الطالب بنجاح."); onDataChange(); }
    }
  };

  return (
    <div className="student-card card">
      <div className="student-card-header">
        {/* ======== (بداية التعديل 1: إزالة اسم المجموعة) ======== */}
        <h4>{student.full_name}</h4>
        <div className="card-actions">
          <button onClick={() => onEdit(student)} className="btn-secondary">تعديل</button>
          <button onClick={handleDeleteStudent} className="btn-danger">حذف</button>
        </div>
      </div>

      {/* ======== (بداية التعديل 2: إضافة قسم التقدم) ======== */}
      <div className="student-card-progress">
        <div className="progress-stats">
          <div className="stat-item">
            <span>المحفوظ</span>
            <strong>{totalMemorized}</strong>
          </div>
          <div className="stat-item">
            <span>المتبقي</span>
            <strong>{remainingVerses}</strong>
          </div>
        </div>
        <div className="progress-bar-shell admin-bar">
          <div className="progress-bar-fill" style={{ width: `${percentage}%` }}></div>
        </div>
        <span className="percentage-text-card">{percentage}%</span>
      </div>
      {/* ======== (نهاية التعديل 2) ======== */}
      
      <button 
        onClick={() => navigate(`/admin/student/${student.id}`)} 
        className="btn-primary" 
        style={{width: '100%', marginTop: '1.5rem'}}
      >
        إدارة سجلات الحفظ
      </button>
    </div>
  );
}

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState([]);
  const [students, setStudents] = useState([]);
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentGroup, setNewStudentGroup] = useState('');
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');
  const [editingStudent, setEditingStudent] = useState(null);
  
  const fetchData = async () => {
    setLoading(true);
    // ======== (بداية التعديل 3: استخدام الدالة الجديدة) ========
    const { data: studentsWithProgress, error: rpcError } = await supabase.rpc('get_all_students_with_progress');
    if(rpcError) console.error("Error fetching student progress:", rpcError);
    else setStudents(studentsWithProgress || []);
    // ======== (نهاية التعديل 3) ========

    const { data: groupsData, error: groupsError } = await supabase.from('groups').select('*');
    if (groupsError) console.error(groupsError.message);
    else {
      setGroups(groupsData);
      if (groupsData.length > 0) setNewStudentGroup(groupsData[0].id);
    }
    
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, []);
  
  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!newStudentName || !newStudentGroup) return alert('يرجى إدخال اسم الطالب واختيار مجموعة.');
    const { error } = await supabase.from('students').insert({
      full_name: newStudentName,
      group_id: newStudentGroup,
    });
    if (error) alert('حدث خطأ: ' + error.message);
    else { alert("تمت إضافة الطالب بنجاح."); setNewStudentName(''); fetchData(); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const filteredStudents = selectedGroupFilter === 'all'
    ? students
    : students.filter(student => student.group_id.toString() === selectedGroupFilter);

  return (
    <div className="admin-dashboard">
      <div className="header">
        <h1>لوحة تحكم المحفّظ</h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Link to="/" className="btn btn-secondary">عرض واجهة الزوار</Link>
          <button onClick={handleLogout} className="btn-danger">تسجيل الخروج</button>
        </div>
      </div>

      <div className="admin-section card">
        <h3>إضافة طالب جديد</h3>
        <form onSubmit={handleAddStudent} className="form-inline">
          <input type="text" placeholder="الاسم الكامل للطالب" value={newStudentName} onChange={(e) => setNewStudentName(e.target.value)} required style={{flexGrow: 2}} />
          <select value={newStudentGroup} onChange={(e) => setNewStudentGroup(e.target.value)} required style={{flexGrow: 1}}>
            {groups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}
          </select>
          <button type="submit" className="btn-primary">إضافة الطالب</button>
        </form>
      </div>

      <div className="admin-section card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <h3>قائمة الطلاب ({filteredStudents.length})</h3>
          <div className="form-inline">
            <label htmlFor="groupFilter" style={{fontWeight: '600'}}>فلترة حسب:</label>
            <select id="groupFilter" value={selectedGroupFilter} onChange={(e) => setSelectedGroupFilter(e.target.value)}>
              <option value="all">كل المجموعات</option>
              {groups.map(g => (<option key={g.id} value={g.id}>{g.name}</option>))}
            </select>
          </div>
        </div>
        
        {loading ? <p>...جاري التحميل</p> : (
          filteredStudents.length > 0 ? (
            <div className="students-grid" style={{marginTop: '1.5rem'}}>
              {filteredStudents.map(student => (
                <StudentCard 
                  key={student.id} 
                  student={student} 
                  onDataChange={fetchData}
                  onEdit={() => setEditingStudent(student)}
                />
              ))}
            </div>
          ) : (
            <p style={{marginTop: '1.5rem', textAlign: 'center'}}>
              {selectedGroupFilter === 'all' ? 'لم يتم إضافة أي طلاب بعد.' : 'لا يوجد طلاب في هذه المجموعة.'}
            </p>
          )
        )}
      </div>
      
      <EditStudentModal
        isOpen={!!editingStudent}
        onClose={() => setEditingStudent(null)}
        onSave={fetchData}
        student={editingStudent}
        groups={groups}
      />
    </div>
  );
}