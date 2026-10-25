import * as React from "react";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./dialog";
import { Popover, PopoverContent, PopoverTrigger } from "./popover";

function WalletPicker() {
  const [container, setContainer] = React.useState<HTMLDivElement | null>(null);
  const [open, setOpen] = React.useState(false);
  const [selected, setSelected] = React.useState("");
  const [search, setSearch] = React.useState("");

  return (
    <Dialog defaultOpen>
      <DialogContent ref={setContainer}>
        <DialogTitle>Transfer between wallets</DialogTitle>
        <DialogDescription>Select a destination wallet.</DialogDescription>
        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger>{selected || "Search destination wallet"}</PopoverTrigger>
          <PopoverContent container={container} aria-label="Destination wallets">
            <input aria-label="Search wallets" value={search} onChange={(event) => setSearch(event.target.value)} />
            {["Beta Utility", "Gamma Landlord"].filter((name) => name.toLowerCase().includes(search.toLowerCase())).map((name) => (
              <button key={name} onClick={() => { setSelected(name); setOpen(false); }}>{name}</button>
            ))}
          </PopoverContent>
        </Popover>
      </DialogContent>
    </Dialog>
  );
}

test("keeps the wallet list inside its modal and supports searching and selecting", async () => {
  const user = userEvent.setup();
  render(<WalletPicker />);
  const dialog = screen.getByRole("dialog", { name: "Transfer between wallets" });
  await user.click(within(dialog).getByRole("button", { name: "Search destination wallet" }));
  const list = screen.getByRole("dialog", { name: "Destination wallets" });
  expect(dialog).toContainElement(list);
  await user.type(within(list).getByRole("textbox", { name: "Search wallets" }), "gamma");
  expect(within(list).queryByRole("button", { name: "Beta Utility" })).not.toBeInTheDocument();
  await user.click(within(list).getByRole("button", { name: "Gamma Landlord" }));
  expect(within(dialog).getByRole("button", { name: "Gamma Landlord" })).toHaveAttribute("aria-expanded", "false");
  expect(screen.queryByRole("dialog", { name: "Destination wallets" })).not.toBeInTheDocument();
});

test("preserves the default body portal for popovers outside a modal", async () => {
  const user = userEvent.setup();
  const { container } = render(
    <Popover>
      <PopoverTrigger>Open picker</PopoverTrigger>
      <PopoverContent aria-label="Standalone picker">Wallet options</PopoverContent>
    </Popover>
  );
  await user.click(screen.getByRole("button", { name: "Open picker" }));
  const list = screen.getByRole("dialog", { name: "Standalone picker" });
  expect(document.body).toContainElement(list);
  expect(container).not.toContainElement(list);
});
