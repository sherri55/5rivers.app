import { Router, Request, Response } from 'express';
import { validateCredentials, generateToken } from '../auth/authService';

const router = Router();

router.post('/login', async (req: Request, res: Response) => {
  try {
    const raw = req.body || {};
    const username = typeof raw.username === 'string' ? raw.username.trim() : '';
    const password = typeof raw.password === 'string' ? raw.password : '';

    if (!username || !password) {
      res.status(400).json({ error: 'Username and password required' });
      return;
    }

    const valid = await validateCredentials(username, password);

    if (!valid) {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    const token = generateToken(username);

    res.json({
      token,
      username,
      expiresIn: '24h',
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

export default router;
