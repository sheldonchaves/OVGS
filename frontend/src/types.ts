export type TransportType = {
  id: string;
  name: string;
  description?: string | null;
  active: boolean;
};

export type Client = {
  id: string;
  name: string;
  document: string;
  email?: string | null;
  phone?: string | null;
  active: boolean;
  authorizedTransports: Array<{
    transportTypeId: string;
    transportType: TransportType;
  }>;
};

export type Item = {
  id: string;
  sku: string;
  name: string;
  description?: string | null;
  unit: string;
  active: boolean;
};

export type SalesOrderStatus =
  | 'CRIADA'
  | 'PLANEJADA'
  | 'AGENDADA'
  | 'EM_TRANSPORTE'
  | 'ENTREGUE';

export type DeliverySchedule = {
  id: string;
  salesOrderId: string;
  deliveryDate: string;
  windowStart: string;
  windowEnd: string;
  confirmed: boolean;
  salesOrder?: SalesOrder;
};

export type SalesOrder = {
  id: string;
  code: string;
  status: SalesOrderStatus;
  notes?: string | null;
  createdAt: string;
  client: Client;
  transportType: TransportType;
  items: Array<{
    id: string;
    quantity: number;
    item: Item;
  }>;
  schedule?: DeliverySchedule | null;
};

export type AuditLog = {
  id: string;
  action: string;
  entityType: string;
  entityId: string;
  previousState?: unknown;
  newState?: unknown;
  userEmail?: string | null;
  userId?: string | null;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    name: string;
    role: string;
  } | null;
};

export const STATUS_FLOW: SalesOrderStatus[] = [
  'CRIADA',
  'PLANEJADA',
  'AGENDADA',
  'EM_TRANSPORTE',
  'ENTREGUE',
];

export const NEXT_STATUS: Record<SalesOrderStatus, SalesOrderStatus | null> = {
  CRIADA: 'PLANEJADA',
  PLANEJADA: 'AGENDADA',
  AGENDADA: 'EM_TRANSPORTE',
  EM_TRANSPORTE: 'ENTREGUE',
  ENTREGUE: null,
};
