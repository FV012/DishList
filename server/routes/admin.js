const router = require('express').Router();
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

const adminOnly = [authMiddleware, requireRole('Admin')];

router.get('/users', ...adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT u.id_user, u.name, u.email, r.name AS role, r.id_role, u.is_blocked
      FROM users u JOIN roles r ON u.id_role = r.id_role
      ORDER BY u.id_user
    `);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/users/:id/block', ...adminOnly, async (req, res) => {
  try {
    if (Number(req.params.id) === req.user.id)
      return res.status(400).json({ message: 'Нельзя заблокировать собственный аккаунт' });
    const { is_blocked } = req.body;
    await db.query('UPDATE users SET is_blocked=? WHERE id_user=?', [is_blocked ? 1 : 0, req.params.id]);
    res.json({ message: is_blocked ? 'Пользователь заблокирован' : 'Пользователь разблокирован' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.put('/users/:id/role', ...adminOnly, async (req, res) => {
  try {
    const { id_role } = req.body;
    await db.query('UPDATE users SET id_role=? WHERE id_user=?', [id_role, req.params.id]);
    res.json({ message: 'Роль обновлена' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/users/:id', ...adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM users WHERE id_user=?', [req.params.id]);
    res.json({ message: 'Пользователь удалён' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/comments', ...adminOnly, async (req, res) => {
  try {
    const { user, recipe, date_from, date_to } = req.query;
    const conditions = [];
    const params = [];

    if (user) {
      conditions.push('u.name LIKE ?');
      params.push(`%${user}%`);
    }
    if (recipe) {
      conditions.push('r.name LIKE ?');
      params.push(`%${recipe}%`);
    }
    if (date_from) {
      conditions.push('DATE(c.comment_date) >= ?');
      params.push(date_from);
    }
    if (date_to) {
      conditions.push('DATE(c.comment_date) <= ?');
      params.push(date_to);
    }

    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : '';
    const [rows] = await db.query(`
      SELECT c.id_comment, c.comment_text, c.comment_date,
             u.name AS user_name, r.name AS recipe_name, r.id_recipe
      FROM comments_on_recipes c
      JOIN users u ON c.id_user = u.id_user
      JOIN recipes r ON c.id_recipe = r.id_recipe
      ${where}
      ORDER BY c.comment_date DESC
    `, params);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/comments/:id', ...adminOnly, async (req, res) => {
  try {
    await db.query('DELETE FROM comments_on_recipes WHERE id_comment=?', [req.params.id]);
    res.json({ message: 'Комментарий удалён' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/stats', ...adminOnly, async (req, res) => {
  try {
    const [[{ recipes }]] = await db.query('SELECT COUNT(*) AS recipes FROM recipes');
    const [[{ users }]] = await db.query('SELECT COUNT(*) AS users FROM users');
    const [[{ comments }]] = await db.query('SELECT COUNT(*) AS comments FROM comments_on_recipes');
    const [[{ ratings }]] = await db.query('SELECT COUNT(*) AS ratings FROM ratings');
    res.json({ recipes, users, comments, ratings });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.get('/roles', ...adminOnly, async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM roles');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
