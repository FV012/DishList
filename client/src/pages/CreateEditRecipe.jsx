import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../api';
import { useConfirm } from '../hooks/useConfirm';
import ConfirmModal from '../components/ConfirmModal';

const emptyStep = () => ({ content: '', photo: '', file: null });
const emptyIng = () => ({ id_ingredient: '', quantity: '', id_unit: '' });

export default function CreateEditRecipe() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isEdit = Boolean(id);
  const { confirm, confirmState, handleConfirm, handleCancel: handleModalCancel } = useConfirm();

  const [form, setForm] = useState({
    name: '', description: '', cooking_time: '', number_of_servings: '1',
    photo_of_the_dish: '',
  });
  const [categories, setCategories] = useState([]);
  const [allCategories, setAllCategories] = useState([]);
  const [ingredients, setIngredients] = useState([emptyIng()]);
  const [allIngredients, setAllIngredients] = useState([]);
  const [units, setUnits] = useState([]);
  const [steps, setSteps] = useState([emptyStep()]);
  const [error, setError] = useState('');
  const [photoError, setPhotoError] = useState('');
  const [uploading, setUploading] = useState(false);

  const isDirty = useRef(false);
  const markDirty = useCallback(() => { isDirty.current = true; }, []);

  useEffect(() => {
    const handler = (e) => {
      if (isDirty.current) {
        e.preventDefault();
        e.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', handler);
    return () => window.removeEventListener('beforeunload', handler);
  }, []);

  useEffect(() => {
    api.get('/categories').then(r => setAllCategories(r.data));
    api.get('/ingredients').then(r => setAllIngredients(r.data));
    api.get('/units').then(r => setUnits(r.data));

    if (isEdit) {
      api.get(`/recipes/${id}`).then(r => {
        const rec = r.data;
        setForm({
          name: rec.name,
          description: rec.description,
          cooking_time: String(rec.cooking_time),
          number_of_servings: String(rec.number_of_servings),
          photo_of_the_dish: rec.photo_of_the_dish,
        });
        setCategories(rec.categories.map(c => c.id_category));
        setIngredients(rec.ingredients.map(i => ({
          id_ingredient: i.id_ingredient,
          quantity: i.ingredient_quantity,
          id_unit: i.id_unit_of_measurement,
        })));
        setSteps(rec.steps.map(s => ({ content: s.cooking_step_content, photo: s.step_photo, file: null })));
      });
    }
  }, [id]);

  const uploadPhoto = async (file) => {
    setUploading(true);
    const fd = new FormData();
    fd.append('photo', file);
    const { data } = await api.post('/recipes/upload', fd);
    setUploading(false);
    return data.filename;
  };

  const handlePhotoChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoError('');
    try {
      const filename = await uploadPhoto(file);
      setForm(prev => ({ ...prev, photo_of_the_dish: filename }));
      markDirty();
    } catch {
      setPhotoError('Ошибка загрузки фото');
    }
  };

  const handleRemovePhoto = async () => {
    const ok = await confirm('Заменить фото на стандартный плейсхолдер?');
    if (!ok) return;
    setForm(prev => ({ ...prev, photo_of_the_dish: 'cutlery.png' }));
    markDirty();
  };

  const handleStepPhotoChange = async (idx, e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const filename = await uploadPhoto(file);
      const updated = [...steps];
      updated[idx] = { ...updated[idx], photo: filename };
      setSteps(updated);
      markDirty();
    } catch {
      setError('Ошибка загрузки фото шага');
    }
  };

  const toggleCategory = (catId) => {
    setCategories(prev =>
      prev.includes(catId) ? prev.filter(c => c !== catId) : [...prev, catId]
    );
    markDirty();
  };

  const handleCancel = async () => {
    if (isDirty.current) {
      const ok = await confirm('Есть несохранённые изменения. Выйти без сохранения?');
      if (!ok) return;
    }
    navigate(-1);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setPhotoError('');

    if (!form.photo_of_the_dish) {
      setPhotoError('Загрузите фото блюда');
      document.getElementById('photo-section')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    if (ingredients.some(i => !i.id_ingredient || !i.quantity || !i.id_unit))
      return setError('Заполните все ингредиенты');
    if (steps.some(s => !s.content))
      return setError('Заполните описание всех шагов');

    const action = isEdit ? 'сохранить изменения' : 'опубликовать рецепт';
    const ok = await confirm(`Вы уверены, что хотите ${action}?`);
    if (!ok) return;

    const payload = {
      name: form.name,
      description: form.description,
      cooking_time: Number(form.cooking_time),
      number_of_servings: Number(form.number_of_servings),
      photo_of_the_dish: form.photo_of_the_dish,
      categories,
      ingredients: ingredients.map(i => ({
        id_ingredient: Number(i.id_ingredient),
        quantity: Number(i.quantity),
        id_unit: Number(i.id_unit),
      })),
      steps: steps.map(s => ({ content: s.content, photo: s.photo || '' })),
    };

    try {
      isDirty.current = false;
      if (isEdit) {
        await api.put(`/recipes/${id}`, payload);
        navigate(`/recipes/${id}`);
      } else {
        const { data } = await api.post('/recipes', payload);
        navigate(`/recipes/${data.id}`);
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Ошибка сохранения');
    }
  };

  const updateForm = (field, value) => {
    setForm(prev => ({ ...prev, [field]: value }));
    markDirty();
  };

  return (
    <div className="create-recipe">
      <h1>{isEdit ? 'Редактировать рецепт' : 'Новый рецепт'}</h1>
      {error && <p className="error">{error}</p>}
      <form onSubmit={handleSubmit}>
        <section className="form-section">
          <h2>Основная информация</h2>
          <label>
            Название *
            <input type="text" value={form.name} required
              onChange={e => updateForm('name', e.target.value)} />
          </label>
          <label>
            Описание *
            <textarea rows={4} value={form.description} required
              onChange={e => updateForm('description', e.target.value)} />
          </label>
          <div className="form-row">
            <label>
              Время приготовления (мин) *
              <input type="number" min="1" value={form.cooking_time} required
                onChange={e => updateForm('cooking_time', e.target.value)} />
            </label>
            <label>
              Количество порций *
              <input type="number" min="1" value={form.number_of_servings} required
                onChange={e => updateForm('number_of_servings', e.target.value)} />
            </label>
          </div>

          <div id="photo-section">
            <label>
              Фото блюда *
              <input type="file" accept="image/*" onChange={handlePhotoChange} />
              {uploading && <span className="upload-hint"> Загрузка...</span>}
            </label>
            {photoError && <p className="field-error">{photoError}</p>}
            {form.photo_of_the_dish && (
              <div className="photo-preview-wrap">
                <img src={`/uploads/${form.photo_of_the_dish}`} alt="preview"
                  className="photo-preview" onError={e => e.target.style.display = 'none'} />
                {user?.role === 'Admin' && form.photo_of_the_dish !== 'cutlery.png' && (
                  <button type="button" className="btn btn--outline btn--sm photo-remove-btn"
                    onClick={handleRemovePhoto}>
                    🖼️ Заменить на плейсхолдер
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        <section className="form-section">
          <h2>Категории</h2>
          <div className="categories-check">
            {allCategories.map(c => (
              <label key={c.id_category} className="check-label">
                <input type="checkbox" checked={categories.includes(c.id_category)}
                  onChange={() => toggleCategory(c.id_category)} />
                {c.name}
              </label>
            ))}
          </div>
        </section>

        <section className="form-section">
          <h2>Ингредиенты *</h2>
          {ingredients.map((ing, idx) => (
            <div key={idx} className="ingredient-row">
              <select value={ing.id_ingredient}
                onChange={e => { const a = [...ingredients]; a[idx].id_ingredient = e.target.value; setIngredients(a); markDirty(); }} required>
                <option value="">Выберите ингредиент</option>
                {allIngredients.map(i => (
                  <option key={i.id_ingredient} value={i.id_ingredient}>{i.name}</option>
                ))}
              </select>
              <input type="number" min="0" step="0.01" placeholder="Кол-во" value={ing.quantity}
                onChange={e => { const a = [...ingredients]; a[idx].quantity = e.target.value; setIngredients(a); markDirty(); }} required />
              <select value={ing.id_unit}
                onChange={e => { const a = [...ingredients]; a[idx].id_unit = e.target.value; setIngredients(a); markDirty(); }} required>
                <option value="">Ед. изм.</option>
                {units.map(u => (
                  <option key={u.id_unit_of_measurement} value={u.id_unit_of_measurement}>{u.name}</option>
                ))}
              </select>
              {ingredients.length > 1 && (
                <button type="button" className="btn btn--sm btn--danger"
                  onClick={() => { setIngredients(ingredients.filter((_, i) => i !== idx)); markDirty(); }}>✕</button>
              )}
            </div>
          ))}
          <button type="button" className="btn btn--outline" style={{ display: 'block', margin: '0 auto' }}
            onClick={() => { setIngredients([...ingredients, emptyIng()]); markDirty(); }}>+ Добавить ингредиент</button>
        </section>

        <section className="form-section">
          <h2>Шаги приготовления *</h2>
          {steps.map((step, idx) => (
            <div key={idx} className="step-editor">
              <div className="step-editor__header">
                <span className="step__num">{idx + 1}</span>
                {steps.length > 1 && (
                  <button type="button" className="btn btn--sm btn--danger"
                    onClick={() => { setSteps(steps.filter((_, i) => i !== idx)); markDirty(); }}>✕</button>
                )}
              </div>
              <textarea rows={3} placeholder="Описание шага..." value={step.content} required
                onChange={e => { const a = [...steps]; a[idx].content = e.target.value; setSteps(a); markDirty(); }} />
              <label className="step-photo-label">
                Фото шага (необязательно)
                <input type="file" accept="image/*" onChange={e => handleStepPhotoChange(idx, e)} />
                {step.photo && (
                  <img src={`/uploads/${step.photo}`} alt="шаг" className="photo-preview"
                    onError={e => e.target.style.display = 'none'} />
                )}
              </label>
            </div>
          ))}
          <button type="button" className="btn btn--outline" style={{ display: 'block', margin: '0 auto' }}
            onClick={() => { setSteps([...steps, emptyStep()]); markDirty(); }}>+ Добавить шаг</button>
        </section>

        <div className="form-actions">
          <button type="button" className="btn btn--outline" onClick={handleCancel}>Отмена</button>
          <button type="submit" className="btn btn--primary" disabled={uploading}>
            {isEdit ? 'Сохранить изменения' : 'Опубликовать рецепт'}
          </button>
        </div>
      </form>
      {confirmState && <ConfirmModal message={confirmState.message} onConfirm={handleConfirm} onCancel={handleModalCancel} />}
    </div>
  );
}
