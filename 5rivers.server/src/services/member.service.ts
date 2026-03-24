import { v4 as uuid } from 'uuid';
import { query } from '../db/connection';
import { hashPassword } from './auth.service';
import type { Role } from '../types/auth';
import type { SortOrder } from '../types';

export interface MemberRow {
  userId: string;
  organizationId: string;
  role: string;
  email: string;
  name: string | null;
  createdAt: string;
}

const SORT_COLUMNS = ['email', 'name', 'role', 'createdAt'] as const;
const FILTER_COLUMNS = ['email', 'name', 'role'] as const;

export interface ListMembersOptions {
  sortBy?: string;
  order?: SortOrder;
  filters?: Record<string, string>;
}

export async function listMembers(
  organizationId: string,
  options?: ListMembersOptions
): Promise<MemberRow[]> {
  const sortBy = options?.sortBy && SORT_COLUMNS.includes(options.sortBy as typeof SORT_COLUMNS[number]) ? options.sortBy : 'email';
  const order = options?.order === 'desc' ? 'DESC' : 'ASC';
  const sortCol = sortBy === 'name' || sortBy === 'email' ? `u.${sortBy}` : sortBy === 'createdAt' ? 'om.createdAt' : 'om.role';
  const filterClauses: string[] = [];
  const params: Record<string, unknown> = { organizationId };
  if (options?.filters) {
    for (const col of FILTER_COLUMNS) {
      const v = options.filters[col];
      if (v) {
        const field = col === 'name' || col === 'email' ? `u.${col}` : 'om.role';
        filterClauses.push(`(${field} IS NOT NULL AND ${field} LIKE @filter_${col} ESCAPE '\\')`);
        params[`filter_${col}`] = `%${String(v).replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
      }
    }
  }
  const whereExtra = filterClauses.length ? ` AND ${filterClauses.join(' AND ')}` : '';
  const rows = await query<MemberRow>(
    `SELECT om.userId, om.organizationId, om.role, u.email, u.name,
            CONVERT(VARCHAR(24), om.createdAt, 126) AS createdAt
     FROM OrganizationMember om
     INNER JOIN Users u ON u.id = om.userId
     WHERE om.organizationId = @organizationId${whereExtra}
     ORDER BY ${sortCol} ${order}`,
    { params }
  );
  return Array.isArray(rows) ? rows : [];
}

export interface AddMemberInput {
  email: string;
  password: string;
  name?: string;
  role: Role;
}

/** Add a member to the org. Creates user if not exists (password required for new users). */
export async function addMember(
  organizationId: string,
  input: AddMemberInput
): Promise<MemberRow> {
  const email = input.email.trim().toLowerCase();
  if (!email) {
    throw new Error('email is required');
  }

  let userId: string;
  const existing = await query<Array<{ id: string }>>(
    `SELECT id FROM Users WHERE email = @email`,
    { params: { email } }
  );
  if (Array.isArray(existing) && existing.length > 0) {
    userId = existing[0].id;
  } else {
    if (!input.password?.trim()) {
      throw new Error('password is required when creating a new user');
    }
    userId = uuid();
    const passwordHash = await hashPassword(input.password.trim());
    const name = (input.name ?? '').trim() || null;
    await query(
      `INSERT INTO Users (id, email, passwordHash, name, createdAt, updatedAt)
       VALUES (@userId, @email, @passwordHash, @name, CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'Eastern Standard Time' AS DATETIME2), CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'Eastern Standard Time' AS DATETIME2))`,
      {
        params: {
          userId,
          email,
          passwordHash,
          name,
        },
      }
    );
  }

  const alreadyMember = await query<Array<{ userId: string }>>(
    `SELECT userId FROM OrganizationMember WHERE userId = @userId AND organizationId = @organizationId`,
    { params: { userId, organizationId } }
  );
  if (Array.isArray(alreadyMember) && alreadyMember.length > 0) {
    throw new Error('User is already a member of this organization');
  }

  await query(
    `INSERT INTO OrganizationMember (userId, organizationId, role, createdAt)
     VALUES (@userId, @organizationId, @role, CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'Eastern Standard Time' AS DATETIME2))`,
    {
      params: {
        userId,
        organizationId,
        role: input.role,
      },
    }
  );

  const members = await listMembers(organizationId);
  const member = members.find((m) => m.userId === userId);
  if (!member) throw new Error('Failed to load created member');
  return member;
}

export interface UpdateMemberInput {
  role?: Role;
  name?: string;
}

export async function updateMember(
  organizationId: string,
  userId: string,
  input: UpdateMemberInput
): Promise<MemberRow | null> {
  if (input.role !== undefined) {
    await query(
      `UPDATE OrganizationMember SET role = @role
       WHERE userId = @userId AND organizationId = @organizationId`,
      { params: { userId, organizationId, role: input.role } }
    );
  }
  if (input.name !== undefined) {
    await query(
      `UPDATE Users SET name = @name, updatedAt = CAST(SYSDATETIMEOFFSET() AT TIME ZONE 'Eastern Standard Time' AS DATETIME2) WHERE id = @userId`,
      { params: { userId, name: (input.name ?? '').trim() || null } }
    );
  }
  const members = await listMembers(organizationId);
  return members.find((m) => m.userId === userId) ?? null;
}

export async function removeMember(
  organizationId: string,
  userId: string
): Promise<boolean> {
  const existing = await query<Array<{ userId: string }>>(
    `SELECT userId FROM OrganizationMember WHERE userId = @userId AND organizationId = @organizationId`,
    { params: { userId, organizationId } }
  );
  if (!Array.isArray(existing) || existing.length === 0) {
    return false;
  }
  await query(
    `DELETE FROM OrganizationMember WHERE userId = @userId AND organizationId = @organizationId`,
    { params: { userId, organizationId } }
  );
  return true;
}
