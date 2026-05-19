const router = require('express').Router();
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, unique + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 10 * 1024 * 1024 } });

router.post('/upload', authMiddleware, upload.single('photo'), (req, res) => {
  if (!req.file) return res.status(400).json({ message: 'Файл не загружен' });
  res.json({ filename: req.file.filename });
});

router.get('/', async (req, res) => {
  try {
    const { search, categories, ingredients, max_time, sort, author_id } = req.query;
    const categoryIds = categories
      ? categories.split(',').map(Number).filter(Boolean)
      : [];
    const ingredientIds = ingredients
      ? ingredients.split(',').map(Number).filter(Boolean)
      : [];

    let sql = `
      SELECT r.id_recipe, r.name, r.photo_of_the_dish, r.cooking_time,
             r.number_of_servings, r.created_at,
             u.name AS author_name,
             IFNULL(AVG(rt.rating_value), 0) AS avg_rating,
             COUNT(DISTINCT rt.id_rating) AS total_ratings,
             COUNT(DISTINCT c.id_comment) AS total_comments
      FROM recipes r
      LEFT JOIN users u ON r.id_user = u.id_user
      LEFT JOIN ratings rt ON r.id_recipe = rt.id_recipe
      LEFT JOIN comments_on_recipes c ON r.id_recipe = c.id_recipe
    `;
    const params = [];
    const conditions = [];

    if (categoryIds.length > 0) {
      sql += ' JOIN recipe_category_connection rcc ON r.id_recipe = rcc.id_recipe';
      conditions.push(`rcc.id_category IN (${categoryIds.map(() => '?').join(',')})`);
      params.push(...categoryIds);
    }
    if (ingredientIds.length > 0) {
      sql += ' JOIN ingredients_in_recipes ir ON r.id_recipe = ir.id_recipe';
      conditions.push(`ir.id_ingredient IN (${ingredientIds.map(() => '?').join(',')})`);
      params.push(...ingredientIds);
    }
    if (author_id) {
      conditions.push('r.id_user = ?');
      params.push(Number(author_id));
    }
    if (search) {
      conditions.push('(r.name LIKE ? OR u.name LIKE ?)');
      params.push(`%${search}%`, `%${search}%`);
    }
    if (max_time) {
      conditions.push('r.cooking_time <= ?');
      params.push(Number(max_time));
    }
    if (conditions.length) sql += ' WHERE ' + conditions.join(' AND ');
    sql += ' GROUP BY r.id_recipe, r.name, r.photo_of_the_dish, r.cooking_time, r.number_of_servings, r.created_at, u.name';

    const havingClauses = [];
    if (categoryIds.length > 1) havingClauses.push(`COUNT(DISTINCT rcc.id_category) = ${categoryIds.length}`);
    if (ingredientIds.length > 1) havingClauses.push(`COUNT(DISTINCT ir.id_ingredient) = ${ingredientIds.length}`);
    if (havingClauses.length > 0) sql += ' HAVING ' + havingClauses.join(' AND ');

    if (sort === 'rating') sql += ' ORDER BY avg_rating DESC';
    else if (sort === 'time') sql += ' ORDER BY r.cooking_time ASC';
    else sql += ' ORDER BY r.created_at DESC';

    const limit  = req.query.limit  ? parseInt(req.query.limit)  : null;
    const offset = req.query.offset ? parseInt(req.query.offset) : 0;
    if (limit !== null) {
      sql += ' LIMIT ? OFFSET ?';
      params.push(limit + 1, offset);
    }

    const [rows] = await db.query(sql, params);

    if (limit !== null) {
      const hasMore = rows.length > limit;
      return res.json({ recipes: hasMore ? rows.slice(0, limit) : rows, hasMore });
    }
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id', async (req, res) => {
  try {
    const id = req.params.id;

    const [[recipe]] = await db.query(`
      SELECT r.*, u.name AS author_name,
             IFNULL(AVG(rt.rating_value), 0) AS avg_rating,
             COUNT(DISTINCT rt.id_rating) AS total_ratings
      FROM recipes r
      LEFT JOIN users u ON r.id_user = u.id_user
      LEFT JOIN ratings rt ON r.id_recipe = rt.id_recipe
      WHERE r.id_recipe = ?
      GROUP BY r.id_recipe
    `, [id]);

    if (!recipe) return res.status(404).json({ message: 'Рецепт не найден' });

    const [steps] = await db.query(
      'SELECT * FROM cooking_steps WHERE id_recipe = ? ORDER BY step_number',
      [id]
    );
    const [ingredients] = await db.query(`
      SELECT ir.*, i.name AS ingredient_name, u.name AS unit_name
      FROM ingredients_in_recipes ir
      JOIN ingredients i ON ir.id_ingredient = i.id_ingredient
      JOIN units_of_measurement u ON ir.id_unit_of_measurement = u.id_unit_of_measurement
      WHERE ir.id_recipe = ?
    `, [id]);
    const [categories] = await db.query(`
      SELECT c.id_category, c.name
      FROM recipe_category_connection rcc
      JOIN categories c ON rcc.id_category = c.id_category
      WHERE rcc.id_recipe = ?
    `, [id]);
    const [comments] = await db.query(`
      SELECT com.*, u.name AS user_name, rt.rating_value
      FROM comments_on_recipes com
      JOIN users u ON com.id_user = u.id_user
      LEFT JOIN ratings rt ON rt.id_recipe = com.id_recipe AND rt.id_user = com.id_user
      WHERE com.id_recipe = ?
      ORDER BY com.comment_date DESC
    `, [id]);

    res.json({ ...recipe, steps, ingredients, categories, comments });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', authMiddleware, requireRole('Editor', 'Admin'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const {
      name, description, cooking_time, number_of_servings,
      photo_of_the_dish, categories, ingredients, steps,
    } = req.body;

    if (!name || !description || !cooking_time || !photo_of_the_dish)
      return res.status(400).json({ message: 'Заполните все обязательные поля' });
    if (!ingredients || ingredients.length === 0)
      return res.status(400).json({ message: 'Добавьте хотя бы один ингредиент' });
    if (!steps || steps.length === 0)
      return res.status(400).json({ message: 'Добавьте хотя бы один шаг' });

    const [result] = await conn.query(
      'INSERT INTO recipes (name, description, cooking_time, number_of_servings, id_user, photo_of_the_dish) VALUES (?,?,?,?,?,?)',
      [name, description, Number(cooking_time), Number(number_of_servings) || 1, req.user.id, photo_of_the_dish]
    );
    const recipeId = result.insertId;

    for (const ing of ingredients) {
      await conn.query(
        'INSERT INTO ingredients_in_recipes (id_recipe, id_ingredient, ingredient_quantity, id_unit_of_measurement) VALUES (?,?,?,?)',
        [recipeId, ing.id_ingredient, ing.quantity, ing.id_unit]
      );
    }

    for (let i = 0; i < steps.length; i++) {
      await conn.query(
        'INSERT INTO cooking_steps (id_recipe, step_number, cooking_step_content, step_photo) VALUES (?,?,?,?)',
        [recipeId, i + 1, steps[i].content, steps[i].photo || '']
      );
    }

    if (categories && categories.length > 0) {
      for (const catId of categories) {
        await conn.query(
          'INSERT INTO recipe_category_connection (id_recipe, id_category) VALUES (?,?)',
          [recipeId, catId]
        );
      }
    }

    await conn.commit();
    res.status(201).json({ id: recipeId });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
});

router.put('/:id', authMiddleware, requireRole('Editor', 'Admin'), async (req, res) => {
  const conn = await db.getConnection();
  try {
    await conn.beginTransaction();
    const id = req.params.id;

    if (req.user.role === 'Editor') {
      const [[rec]] = await conn.query('SELECT id_user FROM recipes WHERE id_recipe=?', [id]);
      if (!rec) return res.status(404).json({ message: 'Рецепт не найден' });
      if (rec.id_user !== req.user.id)
        return res.status(403).json({ message: 'Можно редактировать только свои рецепты' });
    }

    const {
      name, description, cooking_time, number_of_servings,
      photo_of_the_dish, categories, ingredients, steps,
    } = req.body;

    await conn.query(
      'UPDATE recipes SET name=?, description=?, cooking_time=?, number_of_servings=?, photo_of_the_dish=? WHERE id_recipe=?',
      [name, description, Number(cooking_time), Number(number_of_servings) || 1, photo_of_the_dish, id]
    );

    await conn.query('DELETE FROM ingredients_in_recipes WHERE id_recipe=?', [id]);
    for (const ing of ingredients) {
      await conn.query(
        'INSERT INTO ingredients_in_recipes (id_recipe, id_ingredient, ingredient_quantity, id_unit_of_measurement) VALUES (?,?,?,?)',
        [id, ing.id_ingredient, ing.quantity, ing.id_unit]
      );
    }

    await conn.query('DELETE FROM cooking_steps WHERE id_recipe=?', [id]);
    for (let i = 0; i < steps.length; i++) {
      await conn.query(
        'INSERT INTO cooking_steps (id_recipe, step_number, cooking_step_content, step_photo) VALUES (?,?,?,?)',
        [id, i + 1, steps[i].content, steps[i].photo || '']
      );
    }

    await conn.query('DELETE FROM recipe_category_connection WHERE id_recipe=?', [id]);
    if (categories && categories.length > 0) {
      for (const catId of categories) {
        await conn.query(
          'INSERT INTO recipe_category_connection (id_recipe, id_category) VALUES (?,?)',
          [id, catId]
        );
      }
    }

    await conn.commit();
    res.json({ message: 'Рецепт обновлён' });
  } catch (err) {
    await conn.rollback();
    res.status(500).json({ message: err.message });
  } finally {
    conn.release();
  }
});

router.delete('/:id', authMiddleware, requireRole('Editor', 'Admin'), async (req, res) => {
  try {
    if (req.user.role === 'Editor') {
      const [[rec]] = await db.query('SELECT id_user FROM recipes WHERE id_recipe=?', [req.params.id]);
      if (!rec) return res.status(404).json({ message: 'Рецепт не найден' });
      if (rec.id_user !== req.user.id)
        return res.status(403).json({ message: 'Можно удалять только свои рецепты' });
    }
    await db.query('DELETE FROM recipes WHERE id_recipe=?', [req.params.id]);
    res.json({ message: 'Рецепт удалён' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/comments', authMiddleware, async (req, res) => {
  try {
    const { comment_text } = req.body;
    if (!comment_text) return res.status(400).json({ message: 'Текст комментария пуст' });
    await db.query(
      'INSERT INTO comments_on_recipes (id_recipe, id_user, comment_text) VALUES (?,?,?)',
      [req.params.id, req.user.id, comment_text]
    );
    res.status(201).json({ message: 'Комментарий добавлен' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id/comments/:commentId', authMiddleware, async (req, res) => {
  try {
    const { comment_text } = req.body;
    if (!comment_text) return res.status(400).json({ message: 'Текст комментария пуст' });
    const [[com]] = await db.query('SELECT id_user FROM comments_on_recipes WHERE id_comment=?', [req.params.commentId]);
    if (!com) return res.status(404).json({ message: 'Комментарий не найден' });
    if (com.id_user !== req.user.id)
      return res.status(403).json({ message: 'Можно редактировать только свои комментарии' });
    await db.query('UPDATE comments_on_recipes SET comment_text=? WHERE id_comment=?', [comment_text, req.params.commentId]);
    res.json({ message: 'Комментарий обновлён' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id/comments/:commentId', authMiddleware, async (req, res) => {
  try {
    const [[com]] = await db.query('SELECT id_user FROM comments_on_recipes WHERE id_comment=?', [req.params.commentId]);
    if (!com) return res.status(404).json({ message: 'Комментарий не найден' });
    if (req.user.role !== 'Admin' && com.id_user !== req.user.id)
      return res.status(403).json({ message: 'Нет доступа' });
    await db.query('DELETE FROM comments_on_recipes WHERE id_comment=?', [req.params.commentId]);
    res.json({ message: 'Комментарий удалён' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/rating', authMiddleware, async (req, res) => {
  try {
    const { rating_value } = req.body;
    if (!rating_value || rating_value < 1 || rating_value > 5)
      return res.status(400).json({ message: 'Оценка должна быть от 1 до 5' });

    const [existing] = await db.query(
      'SELECT id_rating FROM ratings WHERE id_recipe=? AND id_user=?',
      [req.params.id, req.user.id]
    );
    if (existing.length > 0) {
      await db.query(
        'UPDATE ratings SET rating_value=? WHERE id_recipe=? AND id_user=?',
        [rating_value, req.params.id, req.user.id]
      );
    } else {
      await db.query(
        'INSERT INTO ratings (id_recipe, id_user, rating_value) VALUES (?,?,?)',
        [req.params.id, req.user.id, rating_value]
      );
    }
    res.json({ message: 'Оценка сохранена' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id/rating', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT rating_value FROM ratings WHERE id_recipe=? AND id_user=?',
      [req.params.id, req.user.id]
    );
    res.json({ rating: rows.length > 0 ? rows[0].rating_value : null });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id/rating', authMiddleware, async (req, res) => {
  try {
    await db.query(
      'DELETE FROM ratings WHERE id_recipe=? AND id_user=?',
      [req.params.id, req.user.id]
    );
    res.json({ message: 'Оценка удалена' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/:id/favorite', authMiddleware, async (req, res) => {
  try {
    const [existing] = await db.query(
      'SELECT * FROM favorites WHERE id_recipe=? AND id_user=?',
      [req.params.id, req.user.id]
    );
    if (existing.length > 0) {
      await db.query('DELETE FROM favorites WHERE id_recipe=? AND id_user=?', [req.params.id, req.user.id]);
      res.json({ favorited: false });
    } else {
      await db.query('INSERT INTO favorites (id_recipe, id_user) VALUES (?,?)', [req.params.id, req.user.id]);
      res.json({ favorited: true });
    }
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/:id/favorite', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      'SELECT * FROM favorites WHERE id_recipe=? AND id_user=?',
      [req.params.id, req.user.id]
    );
    res.json({ favorited: rows.length > 0 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
