import * as React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { SearchableNativeSelect } from './searchable-native-select';

beforeAll(() => {
  HTMLElement.prototype.hasPointerCapture = jest.fn(() => false);
  HTMLElement.prototype.setPointerCapture = jest.fn();
  HTMLElement.prototype.releasePointerCapture = jest.fn();
  HTMLElement.prototype.scrollIntoView = jest.fn();
});

function Example() {
  const [value, setValue] = React.useState('');
  return <form data-testid="form"><label htmlFor="owner">Account</label><SearchableNativeSelect id="owner" name="owner" required value={value} onChange={(event) => setValue(event.target.value)}>
    <option value="">Select an account</option><option value="11" data-search-keywords="Kampala 256700000001">Alpha Utility</option><option value="22">Beta Utility</option><option value="33" disabled>Disabled Utility</option>
  </SearchableNativeSelect><output data-testid="selected">{value}</output></form>;
}

test('searches within a native-compatible dropdown and preserves real change events and form values', async () => {
  const user = userEvent.setup();
  render(<Example />);
  await user.click(screen.getByRole('combobox', { name: 'Account' }));
  const search = screen.getByRole('textbox');
  await user.type(search, 'Kampala');
  expect(screen.getByRole('option', { name: 'Alpha Utility' })).toBeInTheDocument();
  expect(screen.queryByRole('option', { name: 'Beta Utility' })).not.toBeInTheDocument();
  await user.click(screen.getByRole('option', { name: 'Alpha Utility' }));
  expect(screen.getByTestId('selected')).toHaveTextContent('11');
  expect(new FormData(screen.getByTestId('form') as HTMLFormElement).get('owner')).toBe('11');
  expect(screen.getByRole('combobox', { name: 'Account' })).toHaveTextContent('Alpha Utility');
});

test('supports empty option values and disabled options', async () => {
  const user = userEvent.setup();
  render(<Example />);
  await user.click(screen.getByRole('combobox', { name: 'Account' }));
  expect(screen.getByRole('option', { name: 'Disabled Utility' })).toHaveAttribute('data-disabled');
  await user.click(screen.getByRole('option', { name: 'Beta Utility' }));
  await user.click(screen.getByRole('combobox', { name: 'Account' }));
  await user.click(screen.getByRole('option', { name: 'Select an account' }));
  expect(screen.getByTestId('selected')).toBeEmptyDOMElement();
  expect((screen.getByTestId('form') as HTMLFormElement).checkValidity()).toBe(false);
});

test('keeps required validation, inherited fieldset disabling and numeric defaults', async () => {
  const ref = React.createRef<HTMLSelectElement>();
  render(<fieldset disabled><label htmlFor="size">Page size</label><SearchableNativeSelect id="size" ref={ref} defaultValue={25}><option value={10}>10</option><option value={25}>25</option></SearchableNativeSelect></fieldset>);
  expect(screen.getByRole('combobox', { name: 'Page size' })).toBeDisabled();
  expect(ref.current).toHaveValue('25');
  expect(screen.getByRole('combobox', { name: 'Page size' })).toHaveTextContent('25');
});

test('retains option grouping and updates dynamic options', async () => {
  const user = userEvent.setup();
  const { rerender } = render(<SearchableNativeSelect aria-label="Region" defaultValue="a"><optgroup label="North"><option value="a">Alpha</option></optgroup></SearchableNativeSelect>);
  rerender(<SearchableNativeSelect aria-label="Region" value="b"><optgroup label="South"><option value="b">Beta</option></optgroup></SearchableNativeSelect>);
  await user.click(screen.getByRole('combobox', { name: 'Region' }));
  expect(screen.getByText('South')).toBeInTheDocument();
  await user.click(screen.getByRole('option', { name: 'Beta' }));
  await waitFor(() => expect(screen.getByRole('combobox', { name: 'Region' })).toHaveTextContent('Beta'));
});

test('uncontrolled selections reset with their enclosing form', async () => {
  const user = userEvent.setup();
  render(<form data-testid="form"><SearchableNativeSelect name="region" aria-label="Region" defaultValue="a"><option value="a">Alpha</option><option value="b">Beta</option></SearchableNativeSelect><button type="reset">Reset form</button></form>);
  await user.click(screen.getByRole('combobox', { name: 'Region' }));
  await user.click(screen.getByRole('option', { name: 'Beta' }));
  await user.click(screen.getByRole('button', { name: 'Reset form' }));
  expect(screen.getByRole('combobox', { name: 'Region' })).toHaveTextContent('Alpha');
  expect(new FormData(screen.getByTestId('form') as HTMLFormElement).get('region')).toBe('a');
});
