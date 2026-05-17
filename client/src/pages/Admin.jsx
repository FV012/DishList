import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import { useConfirm } from '../hooks/useConfirm';
import ConfirmModal from '../components/ConfirmModal';

function DictSection({ title, items, idKey, onAdd, onDelete, confirm }) {
  const [newName, setNewName] = useState('');
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');

  const handleAdd = async (e) => {
    e.preventDefault();
    setError('');
    try {
      await onAdd(newName);
      setNewName('');
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка');
    }
  };

  const handleDelete = async (item) => {
    const ok = await confirm(`Удалить «${item.name}»?`);
    if (!ok) return;
    try {
      await onDelete(item[idKey]);
    } catch (err) {
      setError(err.response?.data?.message || 'Нельзя удалить: значение используется в рецептах');
    }
  };

  const filtered = items.filter(item =>
    item.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="dict-section">
      <h3>{title} <span className="dict-count">{filtered.length} / {items.length}</span></h3>
      <form className="dict-add" onSubmit={handleAdd}>
        <input value={newName} onChange={e => setNewName(e.target.value)} placeholder="Новое значение..." required />
        <button type="submit" className="btn btn--primary btn--sm">Добавить</button>
      </form>
      {error && <p className="error">{error}</p>}
      <input
        className="dict-search"
        type="text"
        placeholder="Поиск..."
        value={search}
        onChange={e => setSearch(e.target.value)}
      />
      <ul className="dict-list">
        {filtered.length === 0
          ? <li className="dict-empty">Не найдено</li>
          : filtered.map(item => (
            <li key={item[idKey]}>
              <span>{item.name}</span>
              <button className="btn btn--danger btn--sm" onClick={() => handleDelete(item)}>✕</button>
            </li>
          ))
        }
      </ul>
    </div>
  );
}

export default function Admin() {
  const { user: currentUser } = useAuth();
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = searchParams.get('tab') || 'comments';
  const setTab = (key) => setSearchParams({ tab: key }, { replace: true });
  const [comments, setComments] = useState([]);
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [categories, setCategories] = useState([]);
  const [ingredients, setIngredients] = useState([]);
  const [units, setUnits] = useState([]);
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);

  // Поиск пользователей
  const [userSearch, setUserSearch] = useState('');

  // Фильтры комментариев
  const [filterUser, setFilterUser]     = useState('');
  const [filterRecipe, setFilterRecipe] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo]     = useState('');

  const loadComments = useCallback(() => {
    const params = {};
    if (filterUser)     params.user      = filterUser;
    if (filterRecipe)   params.recipe    = filterRecipe;
    if (filterDateFrom) params.date_from = filterDateFrom;
    if (filterDateTo)   params.date_to   = filterDateTo;
    return api.get('/admin/comments', { params }).then(r => setComments(r.data));
  }, [filterUser, filterRecipe, filterDateFrom, filterDateTo]);

  const loadUsers      = () => api.get('/admin/users').then(r => setUsers(r.data));
  const loadRoles      = () => api.get('/admin/roles').then(r => setRoles(r.data));
  const loadCategories = () => api.get('/categories').then(r => setCategories(r.data));
  const loadIngredients= () => api.get('/ingredients').then(r => setIngredients(r.data));
  const loadUnits      = () => api.get('/units').then(r => setUnits(r.data));
  const loadStats      = () => api.get('/admin/stats').then(r => setStats(r.data));

  useEffect(() => {
    setLoading(true);
    Promise.all([loadComments(), loadUsers(), loadRoles(), loadCategories(), loadIngredients(), loadUnits(), loadStats()])
      .finally(() => setLoading(false));
  }, []);

  // Перезагружать комментарии при изменении фильтров
  useEffect(() => {
    loadComments();
  }, [loadComments]);

  const deleteComment = async (id) => {
    const ok = await confirm('Удалить комментарий?');
    if (!ok) return;
    await api.delete(`/admin/comments/${id}`);
    loadComments();
  };

  const deleteUser = async (id) => {
    const ok = await confirm('Удалить пользователя?');
    if (!ok) return;
    await api.delete(`/admin/users/${id}`);
    loadUsers();
  };

  const changeRole = async (userId, roleId) => {
    await api.put(`/admin/users/${userId}/role`, { id_role: roleId });
    loadUsers();
  };

  const toggleBlock = async (user) => {
    const newState = !user.is_blocked;
    const msg = newState
      ? `Заблокировать пользователя «${user.name}»?`
      : `Разблокировать пользователя «${user.name}»?`;
    const ok = await confirm(msg);
    if (!ok) return;
    try {
      await api.put(`/admin/users/${user.id_user}/block`, { is_blocked: newState });
      loadUsers();
    } catch (err) {
      alert(err.response?.data?.message || 'Ошибка');
    }
  };

  const filteredUsers = users.filter(u =>
    u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
    u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  const resetCommentFilters = () => {
    setFilterUser('');
    setFilterRecipe('');
    setFilterDateFrom('');
    setFilterDateTo('');
  };

  const hasCommentFilters = filterUser || filterRecipe || filterDateFrom || filterDateTo;

  const tabs = [
    { key: 'comments', label: 'Комментарии' },
    { key: 'users', label: 'Пользователи' },
    { key: 'dicts', label: 'Справочники' },
    { key: 'stats', label: 'Статистика' },
  ];

  return (
    <div className="admin-page">
      <h1>Панель администратора</h1>
      <div className="admin-tabs">
        {tabs.map(t => (
          <button key={t.key} className={`btn ${tab === t.key ? 'btn--primary' : 'btn--outline'}`}
            onClick={() => setTab(t.key)}>{t.label}</button>
        ))}
      </div>

      {loading && <p className="loading">Загрузка...</p>}

      {tab === 'comments' && (
        <section>
          <h2>Модерация комментариев</h2>

          <div className="admin-filters">
            <input
              type="text"
              placeholder="Пользователь..."
              value={filterUser}
              onChange={e => setFilterUser(e.target.value)}
            />
            <input
              type="text"
              placeholder="Рецепт..."
              value={filterRecipe}
              onChange={e => setFilterRecipe(e.target.value)}
            />
            <input
              type="date"
              value={filterDateFrom}
              onChange={e => setFilterDateFrom(e.target.value)}
              title="Дата от"
            />
            <input
              type="date"
              value={filterDateTo}
              onChange={e => setFilterDateTo(e.target.value)}
              title="Дата до"
            />
            <button
              className="btn btn--outline btn--sm"
              onClick={resetCommentFilters}
              disabled={!hasCommentFilters}
            >
              Сбросить
            </button>
          </div>

          {comments.length === 0 ? <p className="empty">Комментариев не найдено</p> : (
            <div className="table-wrap">
              <table className="admin-table">
                <thead>
                  <tr><th>Рецепт</th><th>Пользователь</th><th>Комментарий</th><th>Дата</th><th>Действие</th></tr>
                </thead>
                <tbody>
                  {comments.map(c => (
                    <tr key={c.id_comment}>
                      <td><a href={`/recipes/${c.id_recipe}`}>{c.recipe_name}</a></td>
                      <td>{c.user_name}</td>
                      <td>{c.comment_text}</td>
                      <td>{new Date(c.comment_date).toLocaleDateString('ru-RU')}</td>
                      <td>
                        <button className="btn btn--danger btn--sm" onClick={() => deleteComment(c.id_comment)}>
                          Удалить
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      {tab === 'users' && (
        <section>
          <h2>Управление пользователями</h2>
          <div className="admin-filters">
            <input
              type="text"
              placeholder="Поиск по имени или email..."
              value={userSearch}
              onChange={e => setUserSearch(e.target.value)}
            />
            {userSearch && (
              <button className="btn btn--outline btn--sm" onClick={() => setUserSearch('')}>
                Сбросить
              </button>
            )}
          </div>
          <div className="table-wrap">
            <table className="admin-table">
              <thead>
                <tr><th>Имя</th><th>Email</th><th>Роль</th><th>Статус</th><th>Действие</th></tr>
              </thead>
              <tbody>
                {filteredUsers.length === 0
                  ? <tr><td colSpan={5} style={{ textAlign: 'center', color: '#999' }}>Не найдено</td></tr>
                  : filteredUsers.map(u => (
                  <tr key={u.id_user} className={u.is_blocked ? 'row--blocked' : ''}>
                    <td>{u.name}</td>
                    <td>{u.email}</td>
                    <td>
                      <select value={u.id_role} onChange={e => changeRole(u.id_user, e.target.value)}>
                        {roles.map(r => (
                          <option key={r.id_role} value={r.id_role}>{r.name}</option>
                        ))}
                      </select>
                    </td>
                    <td>
                      {u.is_blocked
                        ? <span className="badge badge--blocked">Заблокирован</span>
                        : <span className="badge badge--active">Активен</span>
                      }
                    </td>
                    <td>
                      {u.id_user === currentUser.id ? (
                        <span className="admin-table__self-label">Вы</span>
                      ) : (
                        <div className="admin-table__actions">
                          <button
                            className={`btn btn--sm ${u.is_blocked ? 'btn--outline' : 'btn--warning'}`}
                            onClick={() => toggleBlock(u)}
                          >
                            {u.is_blocked ? 'Разблокировать' : 'Заблокировать'}
                          </button>
                          <button className="btn btn--danger btn--sm" onClick={() => deleteUser(u.id_user)}>
                            Удалить
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {tab === 'dicts' && (
        <section>
          <h2>Справочники</h2>
          <div className="dicts-grid">
            <DictSection
              title="Категории"
              items={categories}
              idKey="id_category"
              confirm={confirm}
              onAdd={async (name) => { await api.post('/categories', { name }); loadCategories(); }}
              onDelete={async (id) => { await api.delete(`/categories/${id}`); loadCategories(); }}
            />
            <DictSection
              title="Ингредиенты"
              items={ingredients}
              idKey="id_ingredient"
              confirm={confirm}
              onAdd={async (name) => { await api.post('/ingredients', { name }); loadIngredients(); }}
              onDelete={async (id) => { await api.delete(`/ingredients/${id}`); loadIngredients(); }}
            />
            <DictSection
              title="Единицы измерения"
              items={units}
              idKey="id_unit_of_measurement"
              confirm={confirm}
              onAdd={async (name) => { await api.post('/units', { name }); loadUnits(); }}
              onDelete={async (id) => { await api.delete(`/units/${id}`); loadUnits(); }}
            />
          </div>
        </section>
      )}

      {tab === 'stats' && (
        <section>
          <h2>Статистика системы</h2>
          {stats ? (
            <div className="stats-grid">
              <div className="stat-card"><span className="stat-card__value">{stats.recipes}</span><span className="stat-card__label">Рецептов</span></div>
              <div className="stat-card"><span className="stat-card__value">{stats.users}</span><span className="stat-card__label">Пользователей</span></div>
              <div className="stat-card"><span className="stat-card__value">{stats.comments}</span><span className="stat-card__label">Комментариев</span></div>
              <div className="stat-card"><span className="stat-card__value">{stats.ratings}</span><span className="stat-card__label">Оценок</span></div>
            </div>
          ) : <p className="loading">Загрузка...</p>}
        </section>
      )}

      {confirmState && <ConfirmModal message={confirmState.message} onConfirm={handleConfirm} onCancel={handleCancel} />}
    </div>
  );
}
