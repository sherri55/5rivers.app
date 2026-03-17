/// <reference path="../types/express.d.ts" />
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import * as memberService from '../services/member.service';
import { requireAuth, requireRole } from '../middleware/auth.middleware';
import { badRequest, notFound } from '../middleware/errorHandler';
import type { Role } from '../types/auth';
import { ROLES } from '../types/auth';
import { parseListOptions } from '../types';

const router = Router();
router.use(requireAuth);
router.use(requireRole('OWNER', 'ADMIN'));

router.get(
  '/members',
  asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const { sortBy, order, filters } = parseListOptions(req.query as Record<string, unknown>);
    const members = await memberService.listMembers(orgId, { sortBy, order, filters });
    res.json(members);
  })
);

router.post(
  '/members',
  asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const body = req.body ?? {};
    const email = typeof body.email === 'string' ? body.email.trim() : '';
    const password = typeof body.password === 'string' ? body.password : '';
    const name = typeof body.name === 'string' ? body.name.trim() : undefined;
    const role = body.role as Role | undefined;
    if (!email) {
      throw badRequest('email is required');
    }
    if (!role || !ROLES.includes(role)) {
      throw badRequest('role must be one of: ' + ROLES.join(', '));
    }
    const member = await memberService.addMember(orgId, {
      email,
      password,
      name,
      role,
    });
    res.status(201).json(member);
  })
);

router.patch(
  '/members/:userId',
  asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const { userId } = req.params;
    const body = req.body ?? {};
    const role = body.role as Role | undefined;
    const name = typeof body.name === 'string' ? body.name.trim() : undefined;
    if (!role && name === undefined) {
      throw badRequest('provide role and/or name to update');
    }
    const input: memberService.UpdateMemberInput = {};
    if (role !== undefined) {
      if (!ROLES.includes(role)) throw badRequest('invalid role');
      input.role = role;
    }
    if (name !== undefined) input.name = name;
    const member = await memberService.updateMember(orgId, userId, input);
    if (!member) throw notFound('Member not found');
    res.json(member);
  })
);

router.delete(
  '/members/:userId',
  asyncHandler(async (req: Request, res: Response) => {
    const orgId = req.user!.organizationId;
    const { userId } = req.params;
    const removed = await memberService.removeMember(orgId, userId);
    if (!removed) {
      throw notFound('Member not found');
    }
    res.status(204).send();
  })
);

export default router;
