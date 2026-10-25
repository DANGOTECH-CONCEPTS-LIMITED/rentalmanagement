import * as React from "react"
import * as SelectPrimitive from "@radix-ui/react-select"
import { Check, ChevronDown, ChevronUp } from "lucide-react"

import { cn } from "@/lib/utils"

const Select = SelectPrimitive.Root

const SelectGroup = SelectPrimitive.Group

const SelectValue = SelectPrimitive.Value

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Trigger>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Trigger>
>(({ className, children, ...props }, ref) => (
  <SelectPrimitive.Trigger
    ref={ref}
    className={cn(
      "flex h-12 w-full items-center justify-between rounded-xl border border-input/90 bg-white/95 px-4 py-3 text-sm shadow-sm ring-offset-background transition-all duration-200 placeholder:text-muted-foreground/90 focus:outline-none focus:border-primary/50 focus:ring-4 focus:ring-primary/10 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1",
      className
    )}
    {...props}
  >
    {children}
    <SelectPrimitive.Icon asChild>
      <ChevronDown className="h-4 w-4 opacity-50" />
    </SelectPrimitive.Icon>
  </SelectPrimitive.Trigger>
))
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName

const SelectScrollUpButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollUpButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollUpButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollUpButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronUp className="h-4 w-4" />
  </SelectPrimitive.ScrollUpButton>
))
SelectScrollUpButton.displayName = SelectPrimitive.ScrollUpButton.displayName

const SelectScrollDownButton = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.ScrollDownButton>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.ScrollDownButton>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.ScrollDownButton
    ref={ref}
    className={cn(
      "flex cursor-default items-center justify-center py-1",
      className
    )}
    {...props}
  >
    <ChevronDown className="h-4 w-4" />
  </SelectPrimitive.ScrollDownButton>
))
SelectScrollDownButton.displayName =
  SelectPrimitive.ScrollDownButton.displayName

type SelectSearchState = {
  query: string
  register: (id: string, label: string) => void
  unregister: (id: string) => void
}

const SelectSearchContext = React.createContext<SelectSearchState | null>(null)

function SearchableSelectOptions({ children }: { children: React.ReactNode }) {
  const [query, setQuery] = React.useState("")
  const inputRef = React.useRef<HTMLInputElement>(null)
  React.useLayoutEffect(() => {
    const input = inputRef.current
    const content = input?.closest('[role="listbox"]')
    if (!input || !content) return
    let initialFocus = true
    const focusSearch = (event: Event) => {
      if (initialFocus && event.target !== input) input.focus({ preventScroll: true })
    }
    const allowNavigation = (event: Event) => {
      if (!(event instanceof KeyboardEvent) || ["ArrowDown", "ArrowUp", "Home", "End", "Enter"].includes(event.key)) initialFocus = false
    }
    content.addEventListener("focusin", focusSearch)
    content.addEventListener("keydown", allowNavigation)
    content.addEventListener("pointerdown", allowNavigation)
    content.addEventListener("pointermove", allowNavigation)
    input.focus({ preventScroll: true })
    return () => {
      content.removeEventListener("focusin", focusSearch)
      content.removeEventListener("keydown", allowNavigation)
      content.removeEventListener("pointerdown", allowNavigation)
      content.removeEventListener("pointermove", allowNavigation)
    }
  }, [])
  const [labels, setLabels] = React.useState<Record<string, string>>({})
  const register = React.useCallback((id: string, label: string) => {
    setLabels((current) => current[id] === label ? current : { ...current, [id]: label })
  }, [])
  const unregister = React.useCallback((id: string) => {
    setLabels((current) => {
      const next = { ...current }
      delete next[id]
      return next
    })
  }, [])
  const search = React.useMemo(() => ({ query, register, unregister }), [query, register, unregister])
  const hasResults = Object.values(labels).some((label) => label.toLowerCase().includes(query.toLowerCase()))

  return (
    <SelectSearchContext.Provider value={search}>
      <div className="shrink-0 border-b border-slate-100 p-2">
        <input
          ref={inputRef}
          autoFocus
          aria-label="Search options"
          placeholder="Search options..."
          className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            // Escape reaches Radix's dismiss layer; typing (including Space) must not reach typeahead.
            if (event.key === "Escape") return
            event.stopPropagation()
            if (["ArrowDown", "ArrowUp", "Enter"].includes(event.key)) {
              event.preventDefault()
              if (event.nativeEvent.isComposing) return
              const options = getVisibleSelectOptions(event.currentTarget.closest('[role="listbox"]'))
              const option = event.key === "ArrowUp" ? options[options.length - 1] : options[0]
              option?.focus()
              option?.scrollIntoView({ block: "nearest" })
              if (event.key === "Enter") {
                option?.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }))
              }
            }
            if (event.key === "Tab") event.preventDefault()
          }}
        />
      </div>
      <SelectScrollUpButton />
      <SelectPrimitive.Viewport className="min-h-0 w-full min-w-[var(--radix-select-trigger-width)] flex-1 overflow-y-auto p-1">
        {children}
        {!hasResults && <div role="status" className="px-3 py-6 text-center text-sm text-muted-foreground">No results found.</div>}
      </SelectPrimitive.Viewport>
      <SelectScrollDownButton />
    </SelectSearchContext.Provider>
  )
}

function getVisibleSelectOptions(content: Element | null) {
  return Array.from(content?.querySelectorAll<HTMLElement>('[role="option"]:not([data-disabled]):not([hidden])') ?? [])
}

const SelectContent = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Content>
>(({ className, children, position = "popper", onKeyDown, ...props }, ref) => (
  <SelectPrimitive.Portal>
    <SelectPrimitive.Content
      ref={ref}
      className={cn(
        "relative z-[200] max-h-[min(18rem,var(--radix-select-content-available-height))] min-w-[8rem] overflow-hidden rounded-2xl border border-slate-200 bg-white text-popover-foreground shadow-[0_30px_90px_-36px_rgba(15,23,42,0.42)] ring-1 ring-slate-200/70 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
        position === "popper" &&
          "data-[side=bottom]:translate-y-1 data-[side=left]:-translate-x-1 data-[side=right]:translate-x-1 data-[side=top]:-translate-y-1",
        className
      )}
      position={position}
      {...props}
      onKeyDown={(event) => {
        onKeyDown?.(event)
        if (event.defaultPrevented || !["ArrowDown", "ArrowUp", "Home", "End"].includes(event.key)) return
        event.preventDefault()
        const options = getVisibleSelectOptions(event.currentTarget)
        const index = options.indexOf(document.activeElement as HTMLElement)
        const next = event.key === "Home" ? 0 : event.key === "End" ? options.length - 1 :
          event.key === "ArrowDown" ? index + 1 : index < 0 ? options.length - 1 : index - 1
        options[next]?.focus()
        options[next]?.scrollIntoView({ block: "nearest" })
      }}
    >
      <SearchableSelectOptions>{children}</SearchableSelectOptions>
    </SelectPrimitive.Content>
  </SelectPrimitive.Portal>
))
SelectContent.displayName = SelectPrimitive.Content.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Label>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Label>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Label
    ref={ref}
    className={cn("py-1.5 pl-8 pr-2 text-sm font-semibold", className)}
    {...props}
  />
))
SelectLabel.displayName = SelectPrimitive.Label.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Item>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Item> & { searchKeywords?: string }
>(({ className, children, style, hidden, searchKeywords = "", ...props }, ref) => {
  const search = React.useContext(SelectSearchContext)
  const id = React.useId()
  const textRef = React.useRef<HTMLSpanElement>(null)
  const [label, setLabel] = React.useState("")
  const register = search?.register
  const unregister = search?.unregister
  React.useLayoutEffect(() => {
    const text = `${textRef.current?.textContent ?? props.textValue ?? ""} ${searchKeywords}`
    setLabel(text)
    register?.(id, text)
  }, [children, props.textValue, searchKeywords, id, register])
  React.useLayoutEffect(() => () => unregister?.(id), [id, unregister])
  const filtered = !!search && !label.toLowerCase().includes(search.query.toLowerCase())

  return (
  <SelectPrimitive.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-default select-none items-center rounded-lg py-2 pl-8 pr-3 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className
    )}
    {...props}
    hidden={hidden || filtered}
    style={hidden || filtered ? { ...style, display: "none" } : style}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <SelectPrimitive.ItemIndicator>
        <Check className="h-4 w-4" />
      </SelectPrimitive.ItemIndicator>
    </span>

    {/* Keep filtered items mounted so Radix retains selected labels and native form options. */}
    <SelectPrimitive.ItemText ref={textRef}>{children}</SelectPrimitive.ItemText>
  </SelectPrimitive.Item>
  )
})
SelectItem.displayName = SelectPrimitive.Item.displayName

const SelectSeparator = React.forwardRef<
  React.ElementRef<typeof SelectPrimitive.Separator>,
  React.ComponentPropsWithoutRef<typeof SelectPrimitive.Separator>
>(({ className, ...props }, ref) => (
  <SelectPrimitive.Separator
    ref={ref}
    className={cn("-mx-1 my-1 h-px bg-muted", className)}
    {...props}
  />
))
SelectSeparator.displayName = SelectPrimitive.Separator.displayName

export {
  Select,
  SelectGroup,
  SelectValue,
  SelectTrigger,
  SelectContent,
  SelectLabel,
  SelectItem,
  SelectSeparator,
  SelectScrollUpButton,
  SelectScrollDownButton,
}
