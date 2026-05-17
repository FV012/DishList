import { Link } from 'react-router-dom';

const PLACEHOLDER = '/uploads/cutlery.png';

function isPlaceholder(src) {
  return src === PLACEHOLDER || src.endsWith('cutlery.png');
}

export default function RecipeCard({ recipe }) {
  const photo = recipe.photo_of_the_dish
    ? `/uploads/${recipe.photo_of_the_dish}`
    : PLACEHOLDER;

  const imgClass = isPlaceholder(photo) ? 'img--placeholder' : '';

  return (
    <Link to={`/recipes/${recipe.id_recipe}`} className="recipe-card">
      <div className="recipe-card__img">
        <img
          src={photo}
          alt={recipe.name}
          className={imgClass}
          onError={(e) => {
            e.target.src = PLACEHOLDER;
            e.target.className = 'img--placeholder';
          }}
        />
      </div>
      <div className="recipe-card__body">
        <h3 className="recipe-card__title">{recipe.name}</h3>
        <div className="recipe-card__meta">
          <span>⏱ {recipe.cooking_time} мин</span>
          <span>⭐ {Number(recipe.avg_rating).toFixed(1)}</span>
          <span>💬 {recipe.total_comments}</span>
          {recipe.author_name && <span>👤 {recipe.author_name}</span>}
        </div>
      </div>
    </Link>
  );
}
