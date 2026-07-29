import { canTransition, STATUS_TRANSITIONS } from './sales-order-status';

describe('SalesOrder status transitions', () => {
  it('should allow valid sequential transitions', () => {
    expect(canTransition('CRIADA', 'PLANEJADA')).toBe(true);
    expect(canTransition('PLANEJADA', 'AGENDADA')).toBe(true);
    expect(canTransition('AGENDADA', 'EM_TRANSPORTE')).toBe(true);
    expect(canTransition('EM_TRANSPORTE', 'ENTREGUE')).toBe(true);
  });

  it('should reject invalid transitions', () => {
    expect(canTransition('CRIADA', 'AGENDADA')).toBe(false);
    expect(canTransition('CRIADA', 'ENTREGUE')).toBe(false);
    expect(canTransition('PLANEJADA', 'CRIADA')).toBe(false);
    expect(canTransition('ENTREGUE', 'CRIADA')).toBe(false);
    expect(canTransition('ENTREGUE', 'EM_TRANSPORTE')).toBe(false);
  });

  it('should define empty transitions for ENTREGUE', () => {
    expect(STATUS_TRANSITIONS.ENTREGUE).toEqual([]);
  });
});
