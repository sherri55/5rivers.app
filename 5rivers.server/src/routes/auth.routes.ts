import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { login } from '../services/auth.service';
import { badRequest } from '../middleware/errorHandler';

const router = Router();

router.post('/auth/login', asyncHandler(async (req: Request, res: Response) => {
  const body = req.body ?? {};
  const email = body.email;
  const password = body.password;
  const organizationSlug = body.organizationSlug;
  if (!email || !password || !organizationSlug) {
    throw badRequest('email, password, and organizationSlug are required');
  }
  const result = await login({ email, password, organizationSlug });
  res.json(result);
}));

export default router;
