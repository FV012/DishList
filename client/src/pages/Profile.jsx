import { useState, useEffect } from 'react';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import RecipeCard from '../components/RecipeCard';
import { useConfirm } from '../hooks/useConfirm';
import ConfirmModal from '../components/ConfirmModal';

const ROLE_LABELS = { Admin: 'Администратор', Editor: 'Редактор', User: 'Пользователь' };

export default function Profile() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();

  const [favorites, setFavorites] = useState([]);
  const [myRecipes, setMyRecipes] = useState([]);
  const [myComments, setMyComments] = useState([]);
  const [loading, setLoading] = useState(true);

  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [editCommentError, setEditCommentError] = useState('');

  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'recipes';
  const setTab = (key) => setSearchParams({ tab: key }, { replace: true });

  const [recipeSearch, setRecipeSearch]   = useState('');
  const [favSearch, setFavSearch]         = useState('');
  const [commentSearch, setCommentSearch] = useState('');

  const [settingsForm, setSettingsForm] = useState({ name: user.name, email: user.email, currentPassword: '', newPassword: '', confirmPassword: '' });
  const [settingsError, setSettingsError] = useState('');
  const [settingsSuccess, setSettingsSuccess] = useState('');

  const loadComments = () => api.get('/auth/my-comments').then(r => setMyComments(r.data)).catch(() => {});

  useEffect(() => {
    Promise.all([
      api.get('/favorites'),
      api.get(`/recipes?author_id=${user.id}`),
      api.get('/auth/my-comments'),
    ])
      .then(([favRes, myRes, comRes]) => {
        setFavorites(favRes.data);
        setMyRecipes(myRes.data);
        setMyComments(comRes.data);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleEditComment = (c) => {
    setEditingCommentId(c.id_comment);
    setEditCommentText(c.comment_text);
    setEditCommentError('');
  };

  const handleSaveComment = async (c) => {
    setEditCommentError('');
    try {
      await api.put(`/recipes/${c.id_recipe}/comments/${c.id_comment}`, { comment_text: editCommentText });
      setEditingCommentId(null);
      loadComments();
    } catch (err) {
      setEditCommentError(err.response?.data?.message || 'Ошибка');
    }
  };

  const handleDeleteComment = async (c) => {
    const ok = await confirm('Удалить комментарий?');
    if (!ok) return;
    await api.delete(`/recipes/${c.id_recipe}/comments/${c.id_comment}`);
    loadComments();
  };

  const handleLogout = async () => {
    const ok = await confirm('Вы уверены, что хотите выйти из аккаунта?');
    if (!ok) return;
    logout();
    navigate('/');
  };

  const handleDeleteAccount = async () => {
    const ok = await confirm('Удалить аккаунт безвозвратно? Все ваши данные будут удалены.');
    if (!ok) return;
    try {
      await api.delete('/auth/profile');
      logout();
      navigate('/');
    } catch (err) {
      alert(err.response?.data?.message || 'Ошибка удаления аккаунта');
    }
  };

  const handleSettingsSubmit = async (e) => {
    e.preventDefault();
    setSettingsError('');
    setSettingsSuccess('');
    if (settingsForm.newPassword && settingsForm.newPassword !== settingsForm.confirmPassword) {
      return setSettingsError('Новые пароли не совпадают');
    }
    try {
      const { data } = await api.put('/auth/profile', {
        name: settingsForm.name,
        email: settingsForm.email,
        currentPassword: settingsForm.currentPassword || undefined,
        newPassword: settingsForm.newPassword || undefined,
      });
      login(data.user, data.token);
      setSettingsSuccess('Данные успешно обновлены');
      setSettingsForm(f => ({ ...f, currentPassword: '', newPassword: '', confirmPassword: '' }));
    } catch (err) {
      setSettingsError(err.response?.data?.message || 'Ошибка сохранения');
    }
  };

  const filteredMyRecipes = myRecipes.filter(r =>
    r.name.toLowerCase().includes(recipeSearch.toLowerCase())
  );
  const filteredFavorites = favorites.filter(r =>
    r.name.toLowerCase().includes(favSearch.toLowerCase())
  );
  const filteredMyComments = myComments.filter(c =>
    c.comment_text.toLowerCase().includes(commentSearch.toLowerCase()) ||
    c.recipe_name.toLowerCase().includes(commentSearch.toLowerCase())
  );

  return (
    <div className="profile-page">
      <div className="profile-page__header">
        <div className="profile-avatar">{user.name[0].toUpperCase()}</div>
        <div>
          <h1>{user.name}</h1>
          <p>{user.email}</p>
          <span className="badge">{ROLE_LABELS[user.role] ?? user.role}</span>
        </div>
      </div>

      <div className="profile-tabs">
        {[
          { key: 'recipes', label: 'Мои рецепты' },
          { key: 'favorites', label: 'Избранное' },
          { key: 'comments', label: 'Комментарии' },
          { key: 'settings', label: 'Настройки' },
        ].map(t => (
          <button key={t.key} className={`btn ${tab === t.key ? 'btn--primary' : 'btn--outline'}`}
            onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {tab === 'recipes' && (
      <section>
        <h2>Мои рецепты</h2>
        {!loading && myRecipes.length > 0 && (
          <input
            className="profile-search"
            type="text"
            placeholder="Поиск по названию..."
            value={recipeSearch}
            onChange={e => setRecipeSearch(e.target.value)}
          />
        )}
        {loading ? (
          <p className="loading">Загрузка...</p>
        ) : myRecipes.length === 0 ? (
          <p className="empty">Вы ещё не создали ни одного рецепта</p>
        ) : filteredMyRecipes.length === 0 ? (
          <p className="empty">Ничего не найдено</p>
        ) : (
          <div className="recipes-grid">
            {filteredMyRecipes.map(r => <RecipeCard key={r.id_recipe} recipe={r} />)}
          </div>
        )}
      </section>
      )}

      {tab === 'favorites' && (
      <section>
        <h2>Избранные рецепты</h2>
        {!loading && favorites.length > 0 && (
          <input
            className="profile-search"
            type="text"
            placeholder="Поиск по названию..."
            value={favSearch}
            onChange={e => setFavSearch(e.target.value)}
          />
        )}
        {loading ? (
          <p className="loading">Загрузка...</p>
        ) : favorites.length === 0 ? (
          <p className="empty">Вы ещё не добавили рецепты в избранное</p>
        ) : filteredFavorites.length === 0 ? (
          <p className="empty">Ничего не найдено</p>
        ) : (
          <div className="recipes-grid">
            {filteredFavorites.map(r => <RecipeCard key={r.id_recipe} recipe={r} />)}
          </div>
        )}
      </section>
      )}

      {tab === 'comments' && (
      <section>
        <h2>Мои комментарии</h2>
        {!loading && myComments.length > 0 && (
          <input
            className="profile-search"
            type="text"
            placeholder="Поиск по рецепту или тексту..."
            value={commentSearch}
            onChange={e => setCommentSearch(e.target.value)}
          />
        )}
        {loading ? (
          <p className="loading">Загрузка...</p>
        ) : myComments.length === 0 ? (
          <p className="empty">Вы ещё не оставили ни одного комментария</p>
        ) : filteredMyComments.length === 0 ? (
          <p className="empty">Ничего не найдено</p>
        ) : (
          <div className="my-comments-list">
            {filteredMyComments.map(c => (
              <div key={c.id_comment} className="my-comment">
                <div className="my-comment__meta">
                  <Link to={`/recipes/${c.id_recipe}`} className="my-comment__recipe">{c.recipe_name}</Link>
                  <span className="my-comment__date">{new Date(c.comment_date).toLocaleDateString('ru-RU')}</span>
                </div>
                {editingCommentId === c.id_comment ? (
                  <div className="comment__edit">
                    <textarea rows={3} value={editCommentText} onChange={e => setEditCommentText(e.target.value)} />
                    {editCommentError && <p className="error">{editCommentError}</p>}
                    <div className="comment__edit-actions">
                      <button className="btn btn--primary btn--sm" onClick={() => handleSaveComment(c)}>Сохранить</button>
                      <button className="btn btn--outline btn--sm" onClick={() => setEditingCommentId(null)}>Отмена</button>
                    </div>
                  </div>
                ) : (
                  <>
                    <p className="my-comment__text">{c.comment_text}</p>
                    <div className="comment__actions">
                      <button className="btn btn--outline btn--sm" onClick={() => handleEditComment(c)}>Изменить</button>
                      <button className="btn btn--danger btn--sm" onClick={() => handleDeleteComment(c)}>Удалить</button>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        )}
      </section>
      )}

      {tab === 'settings' && (
      <section>
        <h2>Настройки аккаунта</h2>
        <form className="settings-form" onSubmit={handleSettingsSubmit}>
          <label>
            Имя
            <input type="text" value={settingsForm.name} required
              onChange={e => setSettingsForm(f => ({ ...f, name: e.target.value }))} />
          </label>
          <label>
            Email
            <input type="email" value={settingsForm.email} required
              onChange={e => setSettingsForm(f => ({ ...f, email: e.target.value }))} />
          </label>
          <h3>Смена пароля (необязательно)</h3>
          <label>
            Текущий пароль
            <input type="password" value={settingsForm.currentPassword}
              onChange={e => setSettingsForm(f => ({ ...f, currentPassword: e.target.value }))} />
          </label>
          <label>
            Новый пароль
            <input type="password" value={settingsForm.newPassword}
              onChange={e => setSettingsForm(f => ({ ...f, newPassword: e.target.value }))} />
          </label>
          <label>
            Повторите новый пароль
            <input type="password" value={settingsForm.confirmPassword}
              onChange={e => setSettingsForm(f => ({ ...f, confirmPassword: e.target.value }))} />
          </label>
          {settingsError && <p className="error">{settingsError}</p>}
          {settingsSuccess && <p className="success">{settingsSuccess}</p>}
          <button type="submit" className="btn btn--primary">Сохранить изменения</button>
        </form>

        <div className="danger-zone">
          <h3>Сессия</h3>
          <p>Выйти из аккаунта на этом устройстве.</p>
          <button type="button" className="btn btn--danger" onClick={handleLogout}>
            Выйти из аккаунта
          </button>
        </div>

        {user.role !== 'Admin' && (
          <div className="danger-zone danger-zone--delete">
            <h3>Удаление аккаунта</h3>
            <p>Это действие необратимо. Все ваши рецепты, комментарии и оценки будут удалены.</p>
            <button type="button" className="btn btn--danger" onClick={handleDeleteAccount}>
              Удалить аккаунт
            </button>
          </div>
        )}
      </section>
      )}

      {confirmState && <ConfirmModal message={confirmState.message} onConfirm={handleConfirm} onCancel={handleCancel} />}
    </div>
  );
}
