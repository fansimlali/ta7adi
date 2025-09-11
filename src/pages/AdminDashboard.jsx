import { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate, Link } from 'react-router-dom';
import EditStudentModal from '../components/EditStudentModal';

function StudentCard({ student, groups, onDataChange, onEdit }) {
  const navigate = useNavigate();

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
        <h4>{student.full_name} <small>({groups.find(g => g.id === student.group_id)?.name})</small></h4>
        <div className="card-actions">
          <button onClick={() => onEdit(student)} className="btn-secondary">تعديل</button>
          <button onClick={handleDeleteStudent} className="btn-danger">حذف</button>
        </div>
      </div>
      <button 
        onClick={() => navigate(`/admin/student/${student.id}`)} 
        className="btn-primary" 
        style={{width: '100%', marginTop: '1rem'}}
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
  const [allStudents, setAllStudents] = useState([]); // <-- قائمة الطلاب الأصلية
  const [newStudentName, setNewStudentName] = useState('');
  const [newStudentGroup, setNewStudentGroup] = useState('');
  const [editingStudent, setEditingStudent] = useState(null);

  // ======== (بداية الإضافة: حالات الفلترة والبحث) ========
  const [selectedGroupFilter, setSelectedGroupFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  // ======== (نهاية الإضافة) ========
  
  const fetchData = async () => {
    setLoading(true);
    const [groupsRes, studentsRes] = await Promise.all([
      supabase.from('groups').select('*'),
      supabase.from('students').select('*').order('created_at', { ascending: false })
    ]);

    if (groupsRes.error) console.error(groupsRes.error.message);
    else {
      setGroups(groupsRes.data);
      if (groupsRes.data.length > 0) setNewStudentGroup(groupsRes.data[0].id);
    }

    if (studentsRes.error) console.error(studentsRes.error.message);
    else setAllStudents(studentsRes.data || []);
    
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
    else {
      alert("تمت إضافة الطالب بنجاح.");
      setNewStudentName('');
      fetchData();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  // ======== (بداية التعديل: منطق الفلترة والبحث المدمج) ========
  const filteredStudents = allStudents
    .filter(student => {
      // الفلترة حسب المجموعة
      return selectedGroupFilter === 'all' || student.group_id.toString() === selectedGroupFilter;
    })
    .filter(student => {
      // الفلترة حسب نص البحث (يتجاهل حالة الأحرف)
      return student.full_name.toLowerCase().includes(searchTerm.toLowerCase());
    });
  // ======== (نهاية التعديل) ========

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
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1.5rem', marginBottom: '1rem' }}>
          <h3>قائمة الطلاب ({filteredStudents.length})</h3>
          
          {/* ======== (بداية الإضافة: خانة البحث والفلترة) ======== */}
          <div className="form-inline">
            <input 
              type="text"
              placeholder="ابحث عن اسم الطالب..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{flexGrow: 2}}
            />
            <select id="groupFilter" value={selectedGroupFilter} onChange={(e) => setSelectedGroupFilter(e.target.value)} style={{flexGrow: 1}}>
              <option value="all">كل المجموعات</option>
              {groups.map(g => (<option key={g.id} value={g.id}>{g.name}</option>))}
            </select>
          </div>
          {/* ======== (نهاية الإضافة) ======== */}
        </div>
        
        {loading ? <p>...جاري التحميل</p> : (
          filteredStudents.length > 0 ? (
            <div className="students-grid" style={{marginTop: '1.5rem'}}>
              {filteredStudents.map(student => (
                <StudentCard 
                  key={student.id} 
                  student={student} 
                  groups={groups}
                  onDataChange={fetchData}
                  onEdit={() => setEditingStudent(student)}
                />
              ))}
            </div>
          ) : (
            <p style={{marginTop: '1.5rem', textAlign: 'center'}}>
              لا توجد نتائج تطابق بحثك أو الفلتر المحدد.
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