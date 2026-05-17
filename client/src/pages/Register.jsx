import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';

export default function Register() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      setError('Пароли не совпадают');
      return;
    }
    try {
      const { data } = await api.post('/auth/register', {
        name: form.name,
        email: form.email,
        password: form.password,
      });
      login(data.user, data.token);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка регистрации');
    }
  };

  return (
    <div className="auth-page">
      <form className="auth-form" onSubmit={handleSubmit}>
        <h2>Регистрация</h2>
        {error && <p className="error">{error}</p>}
        <label>
          Имя
          <input type="text" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
        </label>
        <label>
          Email
          <input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
        </label>
        <label>
          Пароль
          <input type="password" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} required minLength={6} />
        </label>
        <label>
          Подтверждение пароля
          <input
            type="password"
            value={form.confirmPassword}
            onChange={e => setForm({ ...form, confirmPassword: e.target.value })}
            required
            minLength={6}
            className={form.confirmPassword && form.password !== form.confirmPassword ? 'input--error' : ''}
          />
          {form.confirmPassword && form.password !== form.confirmPassword && (
            <span className="field-error">Пароли не совпадают</span>
          )}
        </label>
        <button type="submit" className="btn btn--primary btn--full">Зарегистрироваться</button>
        <p>Уже есть аккаунт? <Link to="/login">Войти</Link></p>
      </form>
    </div>
  );
}
