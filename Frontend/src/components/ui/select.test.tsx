import * as React from "react"
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "./dialog"
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "./select"

beforeAll(() => {
  // jsdom does not implement the pointer and layout APIs used by Radix.
  window.PointerEvent = MouseEvent as typeof PointerEvent
  HTMLElement.prototype.hasPointerCapture = () => false
  HTMLElement.prototype.setPointerCapture = () => undefined
  HTMLElement.prototype.releasePointerCapture = () => undefined
  HTMLElement.prototype.scrollIntoView = jest.fn()
  global.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

function Picker(props: React.ComponentProps<typeof Select>) {
  return (
    <Select name="tenant" {...props}>
      <SelectTrigger aria-label="Tenant"><SelectValue placeholder="Choose tenant" /></SelectTrigger>
      <SelectContent aria-label="Tenants">
        <SelectGroup>
          <SelectLabel>Residents</SelectLabel>
          <SelectItem value="internal-001"><span>Alice North</span></SelectItem>
          <SelectItem value="internal-002" disabled>Bob South</SelectItem>
          <SelectItem value="internal-003">Carol West</SelectItem>
          <SelectItem value="internal-004">David East</SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}

async function openPicker(user: ReturnType<typeof userEvent.setup>) {
  await user.click(screen.getByRole("combobox", { name: "Tenant" }))
  const search = await screen.findByRole("textbox", { name: "Search options" })
  await waitFor(() => expect(search).toHaveFocus())
  return search
}

test("searches rendered labels case-insensitively, preserves selected labels, and clears on reopen", async () => {
  const user = userEvent.setup()
  render(<Picker defaultValue="internal-001" />)
  const trigger = screen.getByRole("combobox", { name: "Tenant" })
  const search = await openPicker(user)
  await user.type(search, "cArOl w")
  expect(screen.getByRole("option", { name: "Carol West" })).toBeVisible()
  expect(screen.queryByRole("option", { name: "Alice North" })).not.toBeInTheDocument()
  expect(trigger).toHaveTextContent("Alice North")
  await user.clear(search)
  expect(screen.getAllByRole("option")).toHaveLength(4)
  await user.type(search, "internal-003")
  expect(screen.queryAllByRole("option")).toHaveLength(0)
  expect(screen.getByRole("status")).toHaveTextContent("No results found")
  await user.keyboard("{Enter}")
  expect(search).toHaveFocus()
  await user.keyboard("{Escape}")
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
  expect(screen.getByRole("combobox", { name: "Tenant" })).toHaveFocus()
  const reopened = await openPicker(user)
  expect(reopened).toHaveValue("")
  expect(screen.getAllByRole("option")).toHaveLength(4)
})

test("keeps disabled matches disabled and skips filtered and disabled options during keyboard navigation", async () => {
  const user = userEvent.setup()
  const onValueChange = jest.fn()
  render(<Picker onValueChange={onValueChange} />)
  const search = await openPicker(user)
  await user.type(search, "bob")
  const disabled = screen.getByRole("option", { name: "Bob South" })
  expect(disabled).toHaveAttribute("aria-disabled", "true")
  await user.keyboard("{ArrowDown}{Enter}")
  expect(onValueChange).not.toHaveBeenCalled()
  await user.clear(search)
  await user.keyboard("{ArrowDown}")
  expect(screen.getByRole("option", { name: "Alice North" })).toHaveFocus()
  await user.keyboard("{ArrowDown}")
  expect(screen.getByRole("option", { name: "Carol West" })).toHaveFocus()
  await user.keyboard("{End}")
  expect(screen.getByRole("option", { name: "David East" })).toHaveFocus()
  await user.keyboard("{Home}")
  expect(screen.getByRole("option", { name: "Alice North" })).toHaveFocus()
  await user.click(search)
  await user.type(search, "west")
  await user.keyboard("{ArrowDown}")
  expect(screen.getByRole("option", { name: "Carol West" })).toHaveFocus()
  await user.keyboard("{ArrowDown}")
  expect(screen.getByRole("option", { name: "Carol West" })).toHaveFocus()
  await user.keyboard("{Enter}")
  expect(onValueChange).toHaveBeenCalledWith("internal-003")
  expect(screen.getByRole("combobox", { name: "Tenant" })).toHaveTextContent("Carol West")
})

test("supports controlled selection and native form submission without unregistering filtered options", async () => {
  const user = userEvent.setup()
  function ControlledPicker() {
    const [value, setValue] = React.useState("internal-001")
    return <form aria-label="Lease"><Picker value={value} onValueChange={setValue} /></form>
  }
  render(<ControlledPicker />)
  const form = screen.getByRole("form") as HTMLFormElement
  const search = await openPicker(user)
  await user.type(search, "carol")
  expect(new FormData(form).get("tenant")).toBe("internal-001")
  expect(form.querySelectorAll("select option")).toHaveLength(4)
  await user.click(screen.getByRole("option", { name: "Carol West" }))
  expect(screen.getByRole("combobox", { name: "Tenant" })).toHaveTextContent("Carol West")
  expect(new FormData(screen.getByRole("form") as HTMLFormElement).get("tenant")).toBe("internal-003")
})

test("Enter from search selects the first enabled match even after mouse interaction", async () => {
  const user = userEvent.setup()
  const onValueChange = jest.fn()
  render(<Picker onValueChange={onValueChange} />)
  const search = await openPicker(user)
  await user.hover(screen.getByRole("option", { name: "Carol West" }))
  await user.click(search)
  await user.type(search, "carol west")
  expect(search).toHaveValue("carol west")
  await user.keyboard("{Enter}")
  expect(onValueChange).toHaveBeenCalledWith("internal-003")
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
})

test("matches optional metadata without exposing it in labels or DOM attributes", async () => {
  const user = userEvent.setup()
  render(
    <Select defaultValue="meter-1">
      <SelectTrigger aria-label="Tenant"><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="meter-1" searchKeywords="NWSC NW-1 Kampala">Water meter</SelectItem>
        <SelectItem value="meter-2" searchKeywords="UMEME Entebbe">Electricity meter</SelectItem>
      </SelectContent>
    </Select>
  )
  const trigger = screen.getByRole("combobox", { name: "Tenant" })
  const search = await openPicker(user)
  for (const term of ["nwsc", "NW-1", "kAmPaLa"]) {
    await user.clear(search)
    await user.type(search, term)
    const option = screen.getByRole("option", { name: "Water meter" })
    expect(screen.getAllByRole("option")).toHaveLength(1)
    expect(option).not.toHaveAttribute("searchKeywords")
    expect(option).not.toHaveTextContent("Kampala")
    expect(screen.queryByRole("status")).not.toBeInTheDocument()
    expect(trigger).toHaveTextContent("Water meter")
  }
  await user.keyboard("{Enter}")
  expect(trigger).toHaveTextContent("Water meter")
})

test("retains disabled root behavior", async () => {
  const user = userEvent.setup()
  render(<form aria-label="Lease"><Picker disabled defaultValue="internal-001" /></form>)
  expect(screen.getByRole("combobox", { name: "Tenant" })).toBeDisabled()
  await user.click(screen.getByRole("combobox", { name: "Tenant" }))
  expect(screen.queryByRole("textbox")).not.toBeInTheDocument()
  expect(new FormData(screen.getByRole("form") as HTMLFormElement).has("tenant")).toBe(false)
})

test("searches and selects in a modal portal and Escape dismisses only the select", async () => {
  const user = userEvent.setup()
  render(
    <Dialog defaultOpen>
      <DialogContent>
        <DialogTitle>Lease editor</DialogTitle>
        <DialogDescription>Choose a resident.</DialogDescription>
        <Picker />
      </DialogContent>
    </Dialog>
  )
  const search = await openPicker(user)
  await user.type(search, "David East")
  expect(search).toHaveValue("David East")
  expect(search).toHaveFocus()
  const list = screen.getByRole("listbox", { name: "Tenants" })
  expect(list).toHaveClass("z-[200]")
  expect(document.body).toContainElement(list)
  expect(within(list).getAllByRole("option")).toHaveLength(1)
  await user.keyboard("{ArrowDown}{Enter}")
  expect(screen.getByRole("combobox", { name: "Tenant" })).toHaveTextContent("David East")
  expect(screen.getByRole("dialog", { name: "Lease editor" })).toBeVisible()
  await openPicker(user)
  await user.keyboard("{Escape}")
  expect(screen.queryByRole("listbox")).not.toBeInTheDocument()
  expect(screen.getByRole("dialog", { name: "Lease editor" })).toBeVisible()
})

test("preserves content and item refs, custom props and cancellable key handlers", async () => {
  const user = userEvent.setup()
  const contentRef = React.createRef<HTMLDivElement>()
  const itemRef = React.createRef<HTMLDivElement>()
  const onKeyDown = jest.fn((event: React.KeyboardEvent) => event.preventDefault())
  render(
    <Select>
      <SelectTrigger aria-label="Tenant"><SelectValue /></SelectTrigger>
      <SelectContent ref={contentRef} onKeyDown={onKeyDown} side="top">
        <SelectItem ref={itemRef} value="one" data-testid="custom-item">One</SelectItem>
      </SelectContent>
    </Select>
  )
  const search = await openPicker(user)
  expect(contentRef.current).toBe(screen.getByRole("listbox"))
  expect(itemRef.current).toBe(screen.getByTestId("custom-item"))
  await user.keyboard("{ArrowDown}")
  expect(itemRef.current).toHaveFocus()
  fireEvent.keyDown(itemRef.current!, { key: "Home" })
  expect(onKeyDown).toHaveBeenCalled()
  expect(search).not.toHaveFocus()
})
