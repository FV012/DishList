import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '../api';
import RecipeCard from '../components/RecipeCard';

const PAGE_SIZE = 12;

export default function Home() {
  const [searchParams, setSearchParams] = useSearchParams();

  // Все фильтры живут в URL — сохраняются при навигации назад
  const search   = searchParams.get('search')      || '';
  const catsStr  = searchParams.get('categories')  || '';
  const ingsStr  = searchParams.get('ingredients') || '';
  const max_time = searchParams.get('max_time')    || '';
  const sort     = searchParams.get('sort')        || '';

  const categories  = catsStr ? catsStr.split(',').map(Number).filter(Boolean) : [];
  const ingredients = ingsStr ? ingsStr.split(',').map(Number).filter(Boolean) : [];

  const hasActive = !!(search || catsStr || ingsStr || max_time || sort);

  const setParam = useCallback((key, value) => {
    setSearchParams(prev => {
      const next = new URLSearchParams(prev);
      const empty = value === '' || value === null || (Array.isArray(value) && value.length === 0);
      if (empty) next.delete(key);
      else next.set(key, Array.isArray(value) ? value.join(',') : value);
      return next;
    }, { replace: true });
  }, [setSearchParams]);

  // UI-состояние панелей — открытое состояние хранится в sessionStorage
  const [allCategories, setAllCategories]   = useState([]);
  const [allIngredients, setAllIngredients] = useState([]);
  const [catsOpen, setCatsOpen] = useState(() => sessionStorage.getItem('catsOpen') === '1');
  const [ingsOpen, setIngsOpen] = useState(() => sessionStorage.getItem('ingsOpen') === '1');
  const [catSearch, setCatSearch] = useState('');
  const [ingSearch, setIngSearch] = useState('');

  useEffect(() => { sessionStorage.setItem('catsOpen', catsOpen ? '1' : '0'); }, [catsOpen]);
  useEffect(() => { sessionStorage.setItem('ingsOpen', ingsOpen ? '1' : '0'); }, [ingsOpen]);

  useEffect(() => {
    api.get('/categories').then(r => setAllCategories(r.data)).catch(() => {});
    api.get('/ingredients').then(r => setAllIngredients(r.data)).catch(() => {});
  }, []);

  // Состояние рецептов
  const [recipes, setRecipes]         = useState([]);
  const [hasMore, setHasMore]         = useState(false);
  const [loading, setLoading]         = useState(true);
  const [filtering, setFiltering]     = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [offset, setOffset]           = useState(0);

  const buildParams = useCallback((off) => {
    const p = { limit: PAGE_SIZE, offset: off };
    if (search)   p.search      = search;
    if (catsStr)  p.categories  = catsStr;
    if (ingsStr)  p.ingredients = ingsStr;
    if (max_time) p.max_time    = max_time;
    if (sort)     p.sort        = sort;
    return p;
  }, [search, catsStr, ingsStr, max_time, sort]);

  // Сброс и загрузка первой страницы при изменении фильтров
  useEffect(() => {
    setOffset(0);
    // Первый рендер (recipes пуст) — полный loading; смена фильтра — тихое обновление
    const firstLoad = recipes.length === 0;
    if (firstLoad) setLoading(true);
    else setFiltering(true);
    let cancelled = false;
    api.get('/recipes', { params: buildParams(0) })
      .then(r => {
        if (cancelled) return;
        setRecipes(r.data.recipes);
        setHasMore(r.data.hasMore);
      })
      .catch(() => { if (!cancelled) setRecipes([]); })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
        setFiltering(false);
      });
    return () => { cancelled = true; };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [buildParams]);

  const handleLoadMore = () => {
    const newOffset = offset + PAGE_SIZE;
    setOffset(newOffset);
    setLoadingMore(true);
    api.get('/recipes', { params: buildParams(newOffset) })
      .then(r => {
        setRecipes(prev => [...prev, ...r.data.recipes]);
        setHasMore(r.data.hasMore);
      })
      .catch(() => {})
      .finally(() => setLoadingMore(false));
  };

  const toggleCategory = (id) => {
    const next = categories.includes(id)
      ? categories.filter(c => c !== id)
      : [...categories, id];
    setParam('categories', next);
  };

  const toggleIngredient = (id) => {
    const next = ingredients.includes(id)
      ? ingredients.filter(i => i !== id)
      : [...ingredients, id];
    setParam('ingredients', next);
  };

  const handleReset = () => {
    setSearchParams({}, { replace: true });
    setCatsOpen(false);
    setIngsOpen(false);
    setCatSearch('');
    setIngSearch('');
  };

  const filteredCategories = allCategories.filter(c =>
    c.name.toLowerCase().includes(catSearch.toLowerCase())
  );
  const filteredIngredients = allIngredients.filter(i =>
    i.name.toLowerCase().includes(ingSearch.toLowerCase())
  );

  return (
    <div className="home">
      <div className="home__hero">
        <h1>Каталог кулинарных рецептов</h1>
        <p>Находите вдохновение для каждого приёма пищи</p>
      </div>

      <div className="filters">
        <input
          className="filters__search"
          type="text"
          placeholder="Поиск по названию..."
          value={search}
          onChange={e => setParam('search', e.target.value)}
        />
        <select value={max_time} onChange={e => setParam('max_time', e.target.value)}>
          <option value="">Любое время</option>
          <option value="15">до 15 мин</option>
          <option value="30">до 30 мин</option>
          <option value="60">до 1 часа</option>
          <option value="120">до 2 часов</option>
        </select>
        <select value={sort} onChange={e => setParam('sort', e.target.value)}>
          <option value="">По дате</option>
          <option value="rating">По рейтингу</option>
          <option value="time">По времени</option>
        </select>
        <button
          type="button"
          className={`btn filters__cats-btn ${categories.length > 0 ? 'btn--primary' : 'btn--outline'}`}
          onClick={() => setCatsOpen(o => !o)}
        >
          Категории{categories.length > 0 ? ` (${categories.length})` : ''}
        </button>
        <button
          type="button"
          className={`btn filters__cats-btn ${ingredients.length > 0 ? 'btn--primary' : 'btn--outline'}`}
          onClick={() => setIngsOpen(o => !o)}
        >
          Ингредиенты{ingredients.length > 0 ? ` (${ingredients.length})` : ''}
        </button>
        <button
          type="button"
          className="btn btn--outline"
          onClick={handleReset}
          disabled={!hasActive}
        >
          Сбросить
        </button>

        {catsOpen && (
          <div className="filters__cats-panel">
            <input
              className="filters__panel-search"
              type="text"
              placeholder="Поиск категории..."
              value={catSearch}
              onChange={e => setCatSearch(e.target.value)}
            />
            <div className="filters__panel-items">
              {filteredCategories.map(c => (
                <label key={c.id_category} className="filters__cat-check">
                  <input
                    type="checkbox"
                    checked={categories.includes(c.id_category)}
                    onChange={() => toggleCategory(c.id_category)}
                  />
                  {c.name}
                </label>
              ))}
            </div>
          </div>
        )}

        {ingsOpen && (
          <div className="filters__cats-panel">
            <input
              className="filters__panel-search"
              type="text"
              placeholder="Поиск ингредиента..."
              value={ingSearch}
              onChange={e => setIngSearch(e.target.value)}
            />
            <div className="filters__panel-items">
              {filteredIngredients.map(i => (
                <label key={i.id_ingredient} className="filters__cat-check">
                  <input
                    type="checkbox"
                    checked={ingredients.includes(i.id_ingredient)}
                    onChange={() => toggleIngredient(i.id_ingredient)}
                  />
                  {i.name}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      {loading ? (
        <p className="loading">Загрузка...</p>
      ) : recipes.length === 0 && !filtering ? (
        <p className="empty">Рецепты не найдены</p>
      ) : (
        <>
          <div className={`recipes-grid${filtering ? ' recipes-grid--filtering' : ''}`}>
            {recipes.map(r => <RecipeCard key={r.id_recipe} recipe={r} />)}
          </div>
          {hasMore && !filtering && (
            <div className="load-more">
              <button
                className="btn btn--outline"
                onClick={handleLoadMore}
                disabled={loadingMore}
              >
                {loadingMore ? 'Загрузка...' : 'Показать ещё'}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
