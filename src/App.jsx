import { useState, useEffect } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { supabase } from './supabaseClient';
import PublicView from './pages/PublicView';
import AdminDashboard from './pages/AdminDashboard';
import Auth from './pages/Auth';
import StudentHifdh from './pages/StudentHifdh';

// UID الخاص بك كمحفّظ
const ADMIN_UID = 'db907f6a-cf81-4169-8271-d062fa56e093';


// مكون لحماية المسارات الخاصة بالمدير
function ProtectedRoute({ children, session }) {
  // إذا كان المستخدم مسجلاً وهو المدير، اسمح بالوصول
  if (session && session.user.id === ADMIN_UID) {
    return children;
  }
  // غير ذلك، قم بإعادة التوجيه إلى صفحة تسجيل الدخول
  return <Navigate to="/login" replace />;
}

function App() {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // جلب الجلسة الحالية عند أول تحميل
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // الاستماع لأي تغيير في حالة المصادقة (تسجيل دخول/خروج)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    // إلغاء الاشتراك عند إغلاق التطبيق
    return () => subscription.unsubscribe();
  }, []);

  // عرض رسالة تحميل حتى يتم التحقق من حالة المستخدم
  if (loading) {
    return <div>جاري التحميل...</div>;
  }

  return (
    <Routes>
      {/* تمرير معلومة الجلسة إلى الواجهة العامة */}
      <Route path="/" element={<PublicView session={session} />} />
      <Route path="/login" element={<Auth />} />
      
      {/* حماية مسارات المدير وتمرير الجلسة إليها */}
      <Route
        path="/admin"
        element={<ProtectedRoute session={session}><AdminDashboard session={session} /></ProtectedRoute>}
      />
      <Route
        path="/admin/student/:studentId"
        element={<ProtectedRoute session={session}><StudentHifdh session={session} /></ProtectedRoute>}
      />
      
      {/* أي مسار آخر يعود للصفحة الرئيسية */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;