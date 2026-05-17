const router = require('express').Router();
const db = require('../db');
const { authMiddleware } = require('../middleware/auth');

// Избранные рецепты текущего пользователя
router.get('/', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT r.id_recipe, r.name, r.photo_of_the_dish, r.cooking_time,
             r.number_of_servings, f.date_added_to_favorites,
             u.name AS author_name,
             IFNULL(AVG(rt.rating_value), 0) AS avg_rating
      FROM favorites f
      JOIN recipes r ON f.id_recipe = r.id_recipe
      LEFT JOIN users u ON r.id_user = u.id_user
      LEFT JOIN ratings rt ON r.id_recipe = rt.id_recipe
      WHERE f.id_user = ?
      GROUP BY r.id_recipe, r.name, r.photo_of_the_dish, r.cooking_time, r.number_of_servings, f.date_added_to_favorites, u.name
      ORDER BY f.date_added_to_favorites DESC
    `, [req.user.id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
