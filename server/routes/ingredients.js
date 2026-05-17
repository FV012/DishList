const router = require('express').Router();
const db = require('../db');
const { authMiddleware, requireRole } = require('../middleware/auth');

router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM ingredients ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.post('/', authMiddleware, requireRole('Admin', 'Editor'), async (req, res) => {
  try {
    const { name } = req.body;
    if (!name) return res.status(400).json({ message: 'Название обязательно' });
    const [result] = await db.query('INSERT INTO ingredients (name) VALUES (?)', [name]);
    res.status(201).json({ id: result.insertId, name });
  } catch (err) {
    if (err.code === 'ER_DUP_ENTRY')
      return res.status(409).json({ message: 'Ингредиент уже существует' });
    res.status(500).json({ message: err.message });
  }
});

router.put('/:id', authMiddleware, requireRole('Admin'), async (req, res) => {
  try {
    const { name } = req.body;
    await db.query('UPDATE ingredients SET name=? WHERE id_ingredient=?', [name, req.params.id]);
    res.json({ message: 'Обновлено' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

router.delete('/:id', authMiddleware, requireRole('Admin'), async (req, res) => {
  try {
    await db.query('DELETE FROM ingredients WHERE id_ingredient=?', [req.params.id]);
    res.json({ message: 'Удалено' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
