const router = require('express').Router();
const db = require('../db');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { authMiddleware } = require('../middleware/auth');

// Регистрация
router.post('/register', async (req, res) => {
  try {
    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ message: 'Все поля обязательны' });

    const [existing] = await db.query('SELECT id_user FROM users WHERE email = ?', [email]);
    if (existing.length > 0)
      return res.status(409).json({ message: 'Email уже зарегистрирован' });

    const hash = await bcrypt.hash(password, 10);
    const [result] = await db.query(
      'INSERT INTO users (name, email, password_hash, id_role) VALUES (?, ?, ?, 3)',
      [name, email, hash]
    );

    const token = jwt.sign(
      { id: result.insertId, name, email, role: 'User' },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({ token, user: { id: result.insertId, name, email, role: 'User' } });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Вход
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password)
      return res.status(400).json({ message: 'Email и пароль обязательны' });

    const [rows] = await db.query(
      'SELECT u.*, r.name AS role FROM users u JOIN roles r ON u.id_role = r.id_role WHERE u.email = ?',
      [email]
    );
    if (rows.length === 0)
      return res.status(401).json({ message: 'Неверный email или пароль' });

    const user = rows[0];
    const valid = await bcrypt.compare(password, user.password_hash);
    if (!valid)
      return res.status(401).json({ message: 'Неверный email или пароль' });

    if (user.is_blocked)
      return res.status(403).json({ message: 'Аккаунт заблокирован' });

    const token = jwt.sign(
      { id: user.id_user, name: user.name, email: user.email, role: user.role },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );
    res.json({
      token,
      user: { id: user.id_user, name: user.name, email: user.email, role: user.role },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Мои комментарии
router.get('/my-comments', authMiddleware, async (req, res) => {
  try {
    const [rows] = await db.query(
      `SELECT c.id_comment, c.comment_text, c.comment_date, r.id_recipe, r.name AS recipe_name
       FROM comments_on_recipes c
       JOIN recipes r ON c.id_recipe = r.id_recipe
       WHERE c.id_user = ?
       ORDER BY c.comment_date DESC`,
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Обновить профиль
router.put('/profile', authMiddleware, async (req, res) => {
  try {
    const { name, email, currentPassword, newPassword } = req.body;
    if (!name || !email) return res.status(400).json({ message: 'Имя и email обязательны' });

    const [existing] = await db.query('SELECT id_user FROM users WHERE email = ? AND id_user != ?', [email, req.user.id]);
    if (existing.length > 0) return res.status(409).json({ message: 'Email уже используется' });

    const [[user]] = await db.query(
      'SELECT u.*, r.name AS role FROM users u JOIN roles r ON u.id_role = r.id_role WHERE u.id_user = ?',
      [req.user.id]
    );

    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ message: 'Укажите текущий пароль' });
      const valid = await bcrypt.compare(currentPassword, user.password_hash);
      if (!valid) return res.status(401).json({ message: 'Неверный текущий пароль' });
      const hash = await bcrypt.hash(newPassword, 10);
      await db.query('UPDATE users SET name=?, email=?, password_hash=? WHERE id_user=?', [name, email, hash, req.user.id]);
    } else {
      await db.query('UPDATE users SET name=?, email=? WHERE id_user=?', [name, email, req.user.id]);
    }

    const updatedUser = { id: req.user.id, name, email, role: user.role };
    const token = jwt.sign(updatedUser, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: updatedUser });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Удалить аккаунт
router.delete('/profile', authMiddleware, async (req, res) => {
  try {
    if (req.user.role === 'Admin')
      return res.status(403).json({ message: 'Администратор не может удалить собственный аккаунт' });
    await db.query('DELETE FROM users WHERE id_user = ?', [req.user.id]);
    res.json({ message: 'Аккаунт удалён' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
