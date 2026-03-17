import { FleetStatus, type FleetUnit, type Driver } from '../types';

const PLACEHOLDER_AVATAR = 'https://api.dicebear.com/7.x/avataaars/svg?seed=';

export interface UnitNode {
  id: string;
  name?: string | null;
  description?: string | null;
  color?: string | null;
  plateNumber?: string | null;
  vin?: string | null;
}

export function mapUnitNodeToUi(node: UnitNode): FleetUnit {
  return {
    id: node?.id != null ? String(node.id) : '—',
    name: node?.name ?? '—',
    plate: node?.plateNumber ?? '—',
    model: node?.description ?? node?.vin ?? '—',
    status: FleetStatus.ACTIVE,
  };
}

export interface DriverNode {
  id: string;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
  hourlyRate?: number | null;
}

export function mapDriverNodeToUi(node: DriverNode): Driver {
  return {
    id: node?.id != null ? String(node.id) : '—',
    name: node?.name ?? '—',
    license: node?.phone ?? '—',
    status: FleetStatus.AVAILABLE,
    avatar: PLACEHOLDER_AVATAR + encodeURIComponent(node?.name ?? node?.id ?? 'driver'),
    performance: 0,
  };
}
