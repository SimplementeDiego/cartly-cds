import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ProductRatingSummary } from './ProductRatingSummary';

describe('ProductRatingSummary', () => {
  it('no muestra nada cuando el producto todavía no tiene valoraciones', () => {
    const { container } = render(<ProductRatingSummary average={null} count={0} />);

    expect(container).toBeEmptyDOMElement();
  });

  it('expone el promedio y la cantidad con una descripción accesible', () => {
    render(<ProductRatingSummary average={4.5} count={2} />);

    expect(
      screen.getByRole('img', { name: /4,5 de 5, según 2 valoraciones/i }),
    ).toBeInTheDocument();
  });
});
