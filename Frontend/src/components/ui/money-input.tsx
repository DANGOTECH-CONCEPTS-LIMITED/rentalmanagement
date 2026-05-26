import * as React from "react";
import { Input } from "@/components/ui/input";

type Props = Omit<React.ComponentProps<typeof Input>, "type">;

const fmt = (v: string | number | undefined): string => {
  if (v === "" || v === undefined || v === null) return "";
  const n = typeof v === "number" ? v : Number(String(v).replace(/[^0-9]/g, ""));
  return n > 0 && !isNaN(n) ? n.toLocaleString("en-US") : "";
};

// Currency input that formats with comma-thousands (e.g. 300000 → "300,000").
// Preserves cursor position when commas shift characters.
// onChange fires with e.target.value = raw digits (no commas).
export const MoneyInput = React.forwardRef<HTMLInputElement, Props>(
  ({ value, onChange, ...props }, forwardedRef) => {
    const [display, setDisplay] = React.useState(() => fmt(value));
    const lastParent = React.useRef(value);
    const innerRef = React.useRef<HTMLInputElement>(null);
    const ref = (forwardedRef ?? innerRef) as React.RefObject<HTMLInputElement>;

    // Sync when parent changes the value externally (pre-fill, reset)
    React.useEffect(() => {
      if (value !== lastParent.current) {
        lastParent.current = value;
        setDisplay(fmt(value));
      }
    }, [value]);

    const handleChange: React.ChangeEventHandler<HTMLInputElement> = (e) => {
      const input = e.target;
      const rawDigits = input.value.replace(/[^0-9]/g, "");
      const formatted = rawDigits ? Number(rawDigits).toLocaleString("en-US") : "";

      // How many digits sat to the left of the cursor before formatting?
      const cursorAt = input.selectionStart ?? 0;
      const digitsLeft = input.value.slice(0, cursorAt).replace(/[^0-9]/g, "").length;

      setDisplay(formatted);
      lastParent.current = rawDigits;

      if (onChange) {
        onChange({
          target: { value: rawDigits, name: props.name ?? input.name },
          currentTarget: { value: rawDigits, name: props.name ?? input.name },
          preventDefault: () => {},
          stopPropagation: () => {},
        } as unknown as React.ChangeEvent<HTMLInputElement>);
      }

      // After React flushes, restore cursor to after the same nth digit
      requestAnimationFrame(() => {
        const el = ref.current ?? input;
        if (!el) return;
        let count = 0;
        let newPos = formatted.length;
        for (let i = 0; i < formatted.length; i++) {
          if (/\d/.test(formatted[i])) count++;
          if (count === digitsLeft) { newPos = i + 1; break; }
        }
        try { el.setSelectionRange(newPos, newPos); } catch { /* read-only input */ }
      });
    };

    return (
      <Input
        {...props}
        ref={ref}
        type="text"
        inputMode="numeric"
        value={display}
        onChange={handleChange}
      />
    );
  }
);
MoneyInput.displayName = "MoneyInput";
