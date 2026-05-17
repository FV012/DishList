import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '../api';
import { useAuth } from '../context/AuthContext';
import StarRating from '../components/StarRating';
import { useConfirm } from '../hooks/useConfirm';
import ConfirmModal from '../components/ConfirmModal';

const PLACEHOLDER = '/uploads/cutlery.png';

export default function RecipeDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const { confirm, confirmState, handleConfirm, handleCancel } = useConfirm();

  const [recipe, setRecipe] = useState(null);
  const [servings, setServings] = useState(1);
  const [userRating, setUserRating] = useState(null);
  const [favorited, setFavorited] = useState(false);
  const [comment, setComment] = useState('');
  const [loading, setLoading] = useState(true);
  const [commentError, setCommentError] = useState('');
  const [editingCommentId, setEditingCommentId] = useState(null);
  const [editCommentText, setEditCommentText] = useState('');
  const [editCommentError, setEditCommentError] = useState('');

  const load = () => {
    setLoading(true);
    api.get(`/recipes/${id}`)
      .then(r => {
        setRecipe(r.data);
        setServings(r.data.number_of_servings);
      })
      .catch(() => navigate('/'))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    load();
    if (user) {
      api.get(`/recipes/${id}/rating`).then(r => setUserRating(r.data.rating)).catch(() => {});
      api.get(`/recipes/${id}/favorite`).then(r => setFavorited(r.data.favorited)).catch(() => {});
    }
  }, [id, user]);

  const handleRating = async (val) => {
    if (!user) return navigate('/login');
    await api.post(`/recipes/${id}/rating`, { rating_value: val });
    setUserRating(val);
    load();
  };

  const handleDeleteRating = async () => {
    const ok = await confirm('Удалить свою оценку?');
    if (!ok) return;
    await api.delete(`/recipes/${id}/rating`);
    setUserRating(null);
    load();
  };

  const handleFavorite = async () => {
    if (!user) return navigate('/login');
    const r = await api.post(`/recipes/${id}/favorite`);
    setFavorited(r.data.favorited);
  };

  const handleComment = async (e) => {
    e.preventDefault();
    if (!user) return navigate('/login');
    setCommentError('');
    try {
      await api.post(`/recipes/${id}/comments`, { comment_text: comment });
      setComment('');
      load();
    } catch (err) {
      setCommentError(err.response?.data?.message || 'Ошибка');
    }
  };

  const handleEditComment = (c) => {
    setEditingCommentId(c.id_comment);
    setEditCommentText(c.comment_text);
    setEditCommentError('');
  };

  const handleSaveComment = async (commentId) => {
    setEditCommentError('');
    try {
      await api.put(`/recipes/${id}/comments/${commentId}`, { comment_text: editCommentText });
      setEditingCommentId(null);
      load();
    } catch (err) {
      setEditCommentError(err.response?.data?.message || 'Ошибка');
    }
  };

  const handleDeleteComment = async (commentId) => {
    const ok = await confirm('Удалить комментарий?');
    if (!ok) return;
    await api.delete(`/recipes/${id}/comments/${commentId}`);
    load();
  };

  const handleDelete = async () => {
    const ok = await confirm('Удалить рецепт?');
    if (!ok) return;
    await api.delete(`/recipes/${id}`);
    navigate('/');
  };

  if (loading) return <p className="loading">Загрузка...</p>;
  if (!recipe) return null;

  const modal = confirmState && <ConfirmModal message={confirmState.message} onConfirm={handleConfirm} onCancel={handleCancel} />;

  const scaleFactor = servings / (recipe.number_of_servings || 1);
  const photo = recipe.photo_of_the_dish
    ? `/uploads/${recipe.photo_of_the_dish}`
    : PLACEHOLDER;
  const isPhotoPlaceholder = photo === PLACEHOLDER || photo.endsWith('cutlery.png');

  return (
    <>
    <div className="recipe-detail">
      <div className="recipe-detail__header">
        <img
          className={`recipe-detail__photo${isPhotoPlaceholder ? ' img--placeholder' : ''}`}
          src={photo}
          alt={recipe.name}
          onError={e => { e.target.src = PLACEHOLDER; e.target.classList.add('img--placeholder'); }}
        />
        <div className="recipe-detail__info">
          <h1>{recipe.name}</h1>
          <div className="recipe-detail__meta">
            <span>⏱ {recipe.cooking_time} мин</span>
            <span>🍽️ {recipe.number_of_servings} порц.</span>
            {recipe.author_name && <span>👤 {recipe.author_name}</span>}
            <span>📅 {new Date(recipe.created_at).toLocaleDateString('ru-RU')}</span>
          </div>
          {recipe.categories && recipe.categories.length > 0 && (
            <div className="recipe-detail__cats">
              {recipe.categories.map(c => (
                <Link key={c.id_category} to={`/?categories=${c.id_category}`} className="badge badge--link">{c.name}</Link>
              ))}
            </div>
          )}
          <div className="recipe-detail__rating">
            <StarRating value={Math.round(recipe.avg_rating)} readonly />
            <span>{Number(recipe.avg_rating).toFixed(1)} ({recipe.total_ratings} оценок)</span>
          </div>
          <div className="recipe-detail__actions">
            <button
              className={`btn ${favorited ? 'btn--danger' : 'btn--outline'}`}
              onClick={handleFavorite}
            >
              {favorited ? '❤️ В избранном' : '🤍 В избранное'}
            </button>
            {user && (user.role === 'Admin' || (user.role === 'Editor' && recipe.id_user === user.id)) && (
              <>
                <Link to={`/recipes/${id}/edit`} className="btn btn--outline">✏️ Редактировать</Link>
                <button className="btn btn--danger" onClick={handleDelete}>🗑️ Удалить</button>
              </>
            )}
          </div>
        </div>
      </div>

      <p className="recipe-detail__description">{recipe.description}</p>

      <div className="recipe-detail__servings">
        <strong>Порций:</strong>
        <button className="btn btn--sm" onClick={() => setServings(s => Math.max(1, s - 1))}>−</button>
        <span>{servings}</span>
        <button className="btn btn--sm" onClick={() => setServings(s => s + 1)}>+</button>
      </div>

      <section className="recipe-section">
        <h2>Ингредиенты</h2>
        <ul className="ingredients-list">
          {recipe.ingredients.map(ing => (
            <li key={ing.id_ingredient_in_recipe}>
              <span>{ing.ingredient_name}</span>
              <span>{ing.unit_name === 'шт' ? Math.max(1, Math.round(ing.ingredient_quantity * scaleFactor)) : Math.round(ing.ingredient_quantity * scaleFactor * 10) / 10} {ing.unit_name}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="recipe-section">
        <h2>Приготовление</h2>
        <ol className="steps-list">
          {recipe.steps.map(step => {
            const stepPhoto = step.step_photo ? `/uploads/${step.step_photo}` : null;
            return (
              <li key={step.id_step} className="step">
                <div className="step__content">
                  <span className="step__num">{step.step_number}</span>
                  <p>{step.cooking_step_content}</p>
                </div>
                {stepPhoto && (
                  <img src={stepPhoto} alt={`Шаг ${step.step_number}`}
                    className="step__photo" onError={e => e.target.style.display = 'none'} />
                )}
              </li>
            );
          })}
        </ol>
      </section>

      <section className="recipe-section">
        <h2>Ваша оценка</h2>
        {user ? (
          <div>
            <StarRating value={userRating} onChange={handleRating} />
            <div className="rating-hint-row">
              <p className="hint">{userRating ? `Вы оценили: ${userRating} ★` : 'Нажмите на звезду'}</p>
              {userRating && (
                <button className="btn btn--danger btn--sm" onClick={handleDeleteRating}>Удалить оценку</button>
              )}
            </div>
          </div>
        ) : (
          <p><Link to="/login">Войдите</Link>, чтобы оценить рецепт</p>
        )}
      </section>

      <section className="recipe-section">
        <h2>Комментарии ({recipe.comments.length})</h2>
        {user && (
          <form className="comment-form" onSubmit={handleComment}>
            <textarea
              value={comment}
              onChange={e => setComment(e.target.value)}
              placeholder="Напишите отзыв..."
              rows={3}
              required
            />
            {commentError && <p className="error">{commentError}</p>}
            <button type="submit" className="btn btn--primary">Отправить</button>
          </form>
        )}
        <div className="comments-list">
          {recipe.comments.length === 0 && <p className="empty">Комментариев пока нет</p>}
          {recipe.comments.map(c => (
            <div key={c.id_comment} className="comment">
              <div className="comment__header">
                <div className="comment__header-left">
                  <strong>{c.user_name}</strong>
                  {c.rating_value != null && (
                    <span className="comment__rating">{'★'.repeat(Number(c.rating_value))}{'☆'.repeat(5 - Number(c.rating_value))}</span>
                  )}
                  <span className="comment__date">{new Date(c.comment_date).toLocaleDateString('ru-RU')}</span>
                </div>
                {user && (user.id === c.id_user || user.role === 'Admin') && (
                  <div className="comment__actions">
                    {user.id === c.id_user && (
                      <button className="btn btn--outline btn--sm" onClick={() => handleEditComment(c)}>Изменить</button>
                    )}
                    <button className="btn btn--danger btn--sm" onClick={() => handleDeleteComment(c.id_comment)}>Удалить</button>
                  </div>
                )}
              </div>
              {editingCommentId === c.id_comment ? (
                <div className="comment__edit">
                  <textarea
                    rows={3}
                    value={editCommentText}
                    onChange={e => setEditCommentText(e.target.value)}
                  />
                  {editCommentError && <p className="error">{editCommentError}</p>}
                  <div className="comment__edit-actions">
                    <button className="btn btn--primary btn--sm" onClick={() => handleSaveComment(c.id_comment)}>Сохранить</button>
                    <button className="btn btn--outline btn--sm" onClick={() => setEditingCommentId(null)}>Отмена</button>
                  </div>
                </div>
              ) : (
                <p>{c.comment_text}</p>
              )}
            </div>
          ))}
        </div>
      </section>
    </div>
    {modal}
    </>
  );
}
