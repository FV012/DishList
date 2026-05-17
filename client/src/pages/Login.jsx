import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    try {
      const { data } = await api.post('/auth/login', form);
      login(data.user, data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка входа');
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Вход в систему</h2>
        <label>
          Email
          <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
        </label>
        <label>
          Пароль
          <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required />
        </label>
        {error && <p className="error">{error}</p>}
        <button type="submit" className="btn btn--primary btn--full">Войти</button>
        <p>Нет аккаунта? <Link to="/register">Зарегистрироваться</Link></p>
      </form>
    </div>
  );
}
