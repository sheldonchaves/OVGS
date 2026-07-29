export const STATUS_TRANSITIONS: Record<string, string[]> = {
  CRIADA: ['PLANEJADA'],
  PLANEJADA: ['AGENDADA'],
  AGENDADA: ['EM_TRANSPORTE'],
  EM_TRANSPORTE: ['ENTREGUE'],
  ENTREGUE: [],
};

export function canTransition(from: string, to: string): boolean {
  return STATUS_TRANSITIONS[from]?.includes(to) ?? false;
}
