"use client";

// Searchable multi-select — pattern from shadcn-multi-select-component,
// rebuilt on our popover/command primitives and design tokens.

import * as React from "react";
import { CheckIcon, ChevronDown, XCircle, XIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";

export type MultiSelectOption = {
  label: string;
  value: string;
  icon?: React.ComponentType<{ className?: string }>;
};

export function MultiSelect({
  options,
  value,
  onValueChange,
  placeholder = "Select options",
  searchPlaceholder = "Search…",
  maxCount = 3,
  disabled,
  className,
}: {
  options: MultiSelectOption[];
  value: string[];
  onValueChange: (value: string[]) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  /** badges shown in the trigger before collapsing to “+n more” */
  maxCount?: number;
  disabled?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState(false);

  function toggle(option: string) {
    onValueChange(
      value.includes(option)
        ? value.filter((v) => v !== option)
        : [...value, option]
    );
  }

  function toggleAll() {
    onValueChange(
      value.length === options.length ? [] : options.map((o) => o.value)
    );
  }

  return (
    <Popover open={open} onOpenChange={setOpen} modal>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          aria-expanded={open}
          className={cn(
            "flex min-h-9 w-full items-center rounded-[10px] border border-input bg-transparent px-2 py-1 text-sm transition-colors hover:border-primary/40 focus-visible:outline-2 focus-visible:outline-ring/50 disabled:cursor-not-allowed disabled:opacity-50",
            className
          )}
        >
          {value.length > 0 ? (
            <div className="flex w-full items-center justify-between">
              <div className="flex flex-wrap items-center gap-1">
                {value.slice(0, maxCount).map((v) => {
                  const option = options.find((o) => o.value === v);
                  return (
                    <Badge
                      key={v}
                      className="gap-1 rounded-full border-0 bg-primary/10 px-2.5 font-semibold text-primary"
                    >
                      {option?.icon && <option.icon className="size-3" />}
                      {option?.label ?? v}
                      <XCircle
                        className="size-3.5 cursor-pointer opacity-70 hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggle(v);
                        }}
                      />
                    </Badge>
                  );
                })}
                {value.length > maxCount && (
                  <Badge className="rounded-full border-0 bg-muted px-2.5 font-semibold text-muted-foreground">
                    +{value.length - maxCount} more
                  </Badge>
                )}
              </div>
              <div className="flex items-center gap-1 pl-2">
                <XIcon
                  className="size-4 cursor-pointer text-muted-foreground hover:text-foreground"
                  aria-label="Clear all"
                  onClick={(e) => {
                    e.stopPropagation();
                    onValueChange([]);
                  }}
                />
                <ChevronDown className="size-4 text-muted-foreground" />
              </div>
            </div>
          ) : (
            <div className="flex w-full items-center justify-between">
              <span className="px-1 text-muted-foreground">{placeholder}</span>
              <ChevronDown className="size-4 text-muted-foreground" />
            </div>
          )}
        </button>
      </PopoverTrigger>
      <PopoverContent
        className="w-[var(--radix-popover-trigger-width)] p-0"
        align="start"
      >
        <Command>
          <CommandInput placeholder={searchPlaceholder} />
          <CommandList>
            <CommandEmpty>No results found.</CommandEmpty>
            <CommandGroup>
              <CommandItem onSelect={toggleAll} className="cursor-pointer">
                <span
                  className={cn(
                    "flex size-4 items-center justify-center rounded-[4px] border",
                    value.length === options.length
                      ? "border-primary bg-primary text-primary-foreground"
                      : "border-muted-foreground/40 [&_svg]:invisible"
                  )}
                >
                  <CheckIcon className="size-3" />
                </span>
                (Select all)
              </CommandItem>
              {options.map((option) => {
                const selected = value.includes(option.value);
                return (
                  <CommandItem
                    key={option.value}
                    onSelect={() => toggle(option.value)}
                    className="cursor-pointer"
                  >
                    <span
                      className={cn(
                        "flex size-4 items-center justify-center rounded-[4px] border",
                        selected
                          ? "border-primary bg-primary text-primary-foreground"
                          : "border-muted-foreground/40 [&_svg]:invisible"
                      )}
                    >
                      <CheckIcon className="size-3" />
                    </span>
                    {option.icon && (
                      <option.icon className="size-4 text-muted-foreground" />
                    )}
                    {option.label}
                  </CommandItem>
                );
              })}
            </CommandGroup>
            <CommandSeparator />
            <CommandGroup>
              <div className="flex items-center justify-between">
                {value.length > 0 && (
                  <>
                    <CommandItem
                      onSelect={() => onValueChange([])}
                      className="flex-1 cursor-pointer justify-center"
                    >
                      Clear
                    </CommandItem>
                    <div className="h-5 w-px bg-border" />
                  </>
                )}
                <CommandItem
                  onSelect={() => setOpen(false)}
                  className="flex-1 cursor-pointer justify-center"
                >
                  Close
                </CommandItem>
              </div>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
