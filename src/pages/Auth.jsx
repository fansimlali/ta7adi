import { useState } from 'react';
import { supabase } from '../supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleLogin = async (event) => {
    event.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      alert(error.error_description || error.message);
    } else {
      navigate('/admin'); // توجيه إلى لوحة التحكم بعد النجاح
    }
    setLoading(false);
  };

  return (
    <div className="form-container">
      <h1>لوحة تحكم المحفّظ</h1>
      <p>يرجى تسجيل الدخول للمتابعة</p>
      <form onSubmit={handleLogin}>
        <input
          type="email"
          placeholder="البريد الإلكتروني"
          value={email}
          required
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: '100%' }}
        />
        <input
          type="password"
          placeholder="كلمة المرور"
          value={password}
          required
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%' }}
        />
        <div>
          <button type="submit" disabled={loading} style={{ width: '100%' }}>
            {loading ? '...جاري الدخول' : 'تسجيل الدخول'}
          </button>
        </div>
      </form>
    </div>
  );
}