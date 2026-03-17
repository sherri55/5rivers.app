import type { JobType } from '../types';

const ICON_BY_DISPATCH: Record<string, string> = {
  reefer: 'ac_unit',
  dry: 'inventory_2',
  flatbed: 'width_full',
  hazmat: 'warning',
};
const DEFAULT_ICON = 'local_shipping';

export interface JobTypeNode {
  id: string;
  title?: string | null;
  startLocation?: string | null;
  endLocation?: string | null;
  dispatchType?: string | null;
  rateOfJob?: number | null;
}

export function mapJobTypeNodeToUi(node: JobTypeNode): JobType {
  const dispatch = (node.dispatchType ?? '').toLowerCase();
  const icon = ICON_BY_DISPATCH[dispatch] ?? DEFAULT_ICON;
  const route = [node.startLocation, node.endLocation].filter(Boolean).join(' → ') || '—';
  return {
    id: node?.id != null ? String(node.id) : '—',
    name: node?.title ?? '—',
    baseRate: Number(node?.rateOfJob) || 0,
    description: route,
    icon,
  };
}
