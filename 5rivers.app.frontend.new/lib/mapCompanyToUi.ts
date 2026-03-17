import type { Company } from '../types';

export interface CompanyNode {
  id: string;
  name: string;
  description?: string | null;
  location?: string | null;
  email?: string | null;
  phone?: string | null;
  industry?: string | null;
  size?: string | null;
}

export function mapCompanyNodeToUi(node: CompanyNode): Company {
  return {
    id: node && node.id != null ? String(node.id) : '—',
    name: node?.name ?? '—',
    contact: '—',
    email: node?.email ?? '—',
    address: node?.location ?? node?.description ?? '—',
    status: 'Active',
  };
}
