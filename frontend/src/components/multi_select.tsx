"use client";

import * as React from "react";
import { Check, ChevronsUpDown, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  Popover,
  PopoverTrigger,
  PopoverContent,
} from "@/components/ui/popover";
import {
  Command,
  CommandInput,
  CommandEmpty,
  CommandItem,
  CommandList,
  CommandGroup,
} from "@/components/ui/command";
import { Checkbox } from "@/components/ui/checkbox";

type Option = { label: string; value: string };

interface MultiSelectProps {
  options: Option[];
  value: string[];
  onChange: React.Dispatch<React.SetStateAction<string[]>>;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
  maxTags?: number;
  /** override chip styles if you want (e.g., "bg-brand text-white") */
  chipClassName?: string;
}

export function MultiSelect({
  options,
  value,
  onChange,
  placeholder = "اختر عنصرًا",
  className,
  disabled,
  maxTags = 3,
  chipClassName,
}: MultiSelectProps) {
  const [open, setOpen] = React.useState(false);

  const toggle = (val: string) => {
    onChange((prev) =>
      prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]
    );
  };

  const clearAll = (e?: React.MouseEvent) => {
    e?.stopPropagation?.();
    onChange([]);
  };

  const selected = options.filter((o) => value.includes(o.value));
  const extraCount = Math.max(0, selected.length - maxTags);

  const Chip: React.FC<{ children: React.ReactNode }> = ({ children }) => (
    <span
      className={cn(
        // default uses your accent tokens to match shadcn theme
        "inline-flex items-center rounded-md px-2 py-1 text-xs whitespace-nowrap",
        "bg-accent text-accent-foreground border",
        chipClassName
      )}
    >
      {children}
    </span>
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          role="combobox"
          aria-expanded={open}
          disabled={disabled}
          dir="rtl"
          // match your SelectTrigger classes
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm",
            "ring-offset-background data-[placeholder]:text-muted-foreground",
            "focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
            "[&>span]:line-clamp-1",
            "justify-between gap-2 overflow-hidden",
            className
          )}
        >
          <div className="flex flex-row-reverse items-center gap-2 overflow-hidden">
            <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
            <div className="flex flex-row-reverse items-center gap-1 overflow-hidden">
              {selected.length === 0 ? (
                <span className="text-muted-foreground truncate">{placeholder}</span>
              ) : (
                <>
                  {selected.slice(0, maxTags).map((opt) => (
                    <Chip key={opt.value}>{opt.label}</Chip>
                  ))}
                  {extraCount > 0 && <Chip>+{extraCount}</Chip>}
                </>
              )}
            </div>
          </div>
          {selected.length > 0 && (
            <X onClick={clearAll} className="h-4 w-4 opacity-60 hover:opacity-100" />
          )}
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        className={cn(
          "p-0 w-[320px]",
          // match your SelectContent dark style
          "relative z-50 max-h-[--radix-select-content-available-height] min-w-[8rem] overflow-y-auto overflow-x-hidden rounded-md border shadow-md",
          "bg-[rgba(30,30,30,0.9)] text-white"
        )}
        dir="rtl"
      >
        <Command shouldFilter>
          <CommandInput placeholder="ابحث..." />
          <CommandEmpty>لا توجد نتائج</CommandEmpty>
          <CommandList>
            <CommandGroup>
              {options.map((opt) => {
                const checked = value.includes(opt.value);
                return (
                  <CommandItem
                    key={opt.value}
                    onSelect={() => toggle(opt.value)}
                    className={cn(
                      "relative flex w-full cursor-pointer select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none",
                      // match your SelectItem hover/focus tokens (accent)
                      "hover:bg-accent hover:text-accent-foreground",
                      "focus:bg-accent focus:text-accent-foreground"
                    )}
                  >
                    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
                      <Checkbox
                        checked={checked}
                        onCheckedChange={() => toggle(opt.value)}
                      />
                    </span>
                    <span className="grow">{opt.label}</span>
                    {checked && <Check className="h-4 w-4 opacity-70" />}
                  </CommandItem>
                );
              })}
            </CommandGroup>
          </CommandList>
          <div className="flex items-center justify-between px-3 py-2 border-t border-border">
            <Button type="button" variant="ghost" onClick={clearAll}>
              مسح الكل
            </Button>
            <Button type="button" onClick={() => setOpen(false)}>
              تم
            </Button>
          </div>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
