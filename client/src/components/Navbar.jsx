import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Navbar() {
  const { user } = useAuth();

  return (
    <nav className="navbar">
      <div className="navbar__left">
        <Link to="/" className="navbar__logo">DishList</Link>
        {user && (user.role === 'Editor' || user.role === 'Admin') && (
          <Link to="/recipes/new">+ Добавить рецепт</Link>
        )}
        {user && user.role === 'Admin' && (
          <Link to="/admin">Админ</Link>
        )}
      </div>
      <div className="navbar__right">
        {user ? (
          <Link to="/profile">👤 {user.name}</Link>
        ) : (
          <>
            <Link to="/login">Войти</Link>
            <Link to="/register" className="btn btn--primary">Регистрация</Link>
          </>
        )}
      </div>
    </nav>
  );
}
