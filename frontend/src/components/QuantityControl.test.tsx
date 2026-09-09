import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { QuantityControl } from './QuantityControl';

describe('QuantityControl', () => {
  it('solicita incrementos y no permite bajar de uno', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    render(<QuantityControl value={1} onChange={onChange} label="Cantidad de prueba" />);

    expect(screen.getByRole('button', { name: /reducir cantidad de prueba/i })).toBeDisabled();
    await user.click(screen.getByRole('button', { name: /aumentar cantidad de prueba/i }));
    expect(onChange).toHaveBeenCalledWith(2);
  });
});
