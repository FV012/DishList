const router = require('express').Router();
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM categories ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', authMiddleware, requireRole('Admin'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Название обязательно' });
    const [result] = await db.query('INSERT INTO categories (name) VALUES (?)', [name]);
    res.status(201).json({ id: result.insertId, name });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ message: 'Категория уже существует' });
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', authMiddleware, requireRole('Admin'), async (req, res) => {
  try {
    const { name } = req.body;
    await db.query('UPDATE categories SET name=? WHERE id_category=?', [name, req.params.id]);
    res.json({ message: 'Обновлено' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', authMiddleware, requireRole('Admin'), async (req, res) => {
  try {
    const [[{ count }]] = await db.query(
      'SELECT COUNT(*) AS count FROM recipe_category_connection WHERE id_category=?',
      [req.params.id]
    );
    if (count > 0)
      return res.status(409).json({ message: 'Нельзя удалить категорию: она используется в рецептах' });
    await db.query('DELETE FROM categories WHERE id_category=?', [req.params.id]);
    res.json({ message: 'Удалено' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
