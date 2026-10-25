import * as React from 'react';
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from './select';

const EMPTY_VALUE = '__searchable_empty_option__';
interface Option { value: string; label: React.ReactNode; disabled?: boolean; group?: string; searchKeywords?: string }

function collectOptions(children: React.ReactNode, group?: string, groupDisabled = false): Option[] {
  return React.Children.toArray(children).flatMap((child) => {
    if (!React.isValidElement<{ value?: string | number; children?: React.ReactNode; disabled?: boolean; label?: string; 'data-search-keywords'?: string }>(child)) return [];
    if (child.type === 'option') return [{ value: String(child.props.value ?? child.props.children ?? ''), label: child.props.children, disabled: groupDisabled || child.props.disabled, group, searchKeywords: child.props['data-search-keywords'] }];
    if (child.type === 'optgroup') return collectOptions(child.props.children, child.props.label, groupDisabled || child.props.disabled);
    if (child.type === React.Fragment) return collectOptions(child.props.children, group, groupDisabled);
    return [];
  });
}

export const SearchableNativeSelect = React.forwardRef<HTMLSelectElement, React.SelectHTMLAttributes<HTMLSelectElement>>(
  ({ children, value, defaultValue, onChange, className, id, style, onBlur, onFocus, 'aria-label': ariaLabel, 'aria-labelledby': labelledBy, ...props }, forwardedRef) => {
    const nativeRef = React.useRef<HTMLSelectElement | null>(null);
    const triggerRef = React.useRef<HTMLButtonElement>(null);
    const options = collectOptions(children);
    const [uncontrolledValue, setUncontrolledValue] = React.useState(() => String(defaultValue ?? options.find((option) => !option.disabled)?.value ?? ''));
    const selected = String(value ?? uncontrolledValue);
    const initialValue = React.useRef(uncontrolledValue);
    React.useEffect(() => {
      const form = nativeRef.current?.form;
      if (!form || value !== undefined) return;
      const reset = () => setUncontrolledValue(initialValue.current);
      form.addEventListener('reset', reset);
      return () => form.removeEventListener('reset', reset);
    }, [value]);
    const groups = [...new Set(options.map((option) => option.group))];
    return <>
      <select
        {...props}
        ref={(node) => { nativeRef.current = node; if (typeof forwardedRef === 'function') forwardedRef(node); else if (forwardedRef) forwardedRef.current = node; }}
        value={selected}
        onChange={(event) => { setUncontrolledValue(event.target.value); onChange?.(event); }}
        aria-hidden="true"
        tabIndex={-1}
        className="sr-only"
        data-searchable-native-select=""
        onInvalid={(event) => { props.onInvalid?.(event); event.preventDefault(); triggerRef.current?.focus(); }}
      >{children}</select>
      <Select
        value={selected || EMPTY_VALUE}
        disabled={props.disabled}
        onValueChange={(next) => {
          const native = nativeRef.current;
          if (!native) return;
          const actual = next === EMPTY_VALUE ? '' : next;
          const setter = Object.getOwnPropertyDescriptor(HTMLSelectElement.prototype, 'value')?.set;
          setter?.call(native, actual);
          native.dispatchEvent(new Event('change', { bubbles: true }));
        }}
      >
        <SelectTrigger ref={triggerRef} id={id} className={className} style={style} aria-label={ariaLabel} aria-labelledby={labelledBy} aria-describedby={props['aria-describedby']} aria-invalid={props['aria-invalid']} aria-required={props.required} title={props.title}
          onBlur={() => { if (nativeRef.current && onBlur) onBlur({ target: nativeRef.current, currentTarget: nativeRef.current } as React.FocusEvent<HTMLSelectElement>); }}
          onFocus={() => { if (nativeRef.current && onFocus) onFocus({ target: nativeRef.current, currentTarget: nativeRef.current } as React.FocusEvent<HTMLSelectElement>); }}
        ><SelectValue /></SelectTrigger>
        <SelectContent>
          {groups.map((group, index) => <SelectGroup key={group ?? index}>
            {group && <SelectLabel>{group}</SelectLabel>}
            {options.filter((option) => option.group === group).map((option) => <SelectItem key={option.value || EMPTY_VALUE} value={option.value || EMPTY_VALUE} disabled={option.disabled} searchKeywords={option.searchKeywords}>{option.label}</SelectItem>)}
          </SelectGroup>)}
        </SelectContent>
      </Select>
    </>;
  }
);
SearchableNativeSelect.displayName = 'SearchableNativeSelect';
