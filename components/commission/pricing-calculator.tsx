'use client';

import { useMemo, useState } from 'react';

import { OptionButton } from '@/components/commission/option-button';
import {
  calculatePricing,
  COMPLEXITY_LABELS,
  DEFAULT_SELECTION,
  MEDIUM_LABELS,
  SIZE_LABELS,
  type AddOns,
  type Complexity,
  type Medium,
  type PricingSelection,
  type Size,
} from '@/lib/commission-pricing';

const currencyFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
});

const ADD_ON_OPTIONS: Array<{ key: keyof AddOns; label: string; hint: string }> = [
  { key: 'extraCharacter', label: 'Extra character', hint: '+$45' },
  { key: 'customBackground', label: 'Custom background', hint: '+$35' },
  { key: 'commercialLicense', label: 'Commercial license', hint: '+$100' },
  { key: 'rushOrder', label: 'Rush order (7 days or less)', hint: '+25%' },
];

export function PricingCalculator() {
  const [selection, setSelection] = useState<PricingSelection>(DEFAULT_SELECTION);

  const breakdown = useMemo(() => calculatePricing(selection), [selection]);

  function setMedium(medium: Medium) {
    setSelection((prev) => ({ ...prev, medium }));
  }

  function setSize(size: Size) {
    setSelection((prev) => ({ ...prev, size }));
  }

  function setComplexity(complexity: Complexity) {
    setSelection((prev) => ({ ...prev, complexity }));
  }

  function toggleAddOn(key: keyof AddOns) {
    setSelection((prev) => ({
      ...prev,
      addOns: { ...prev.addOns, [key]: !prev.addOns[key] },
    }));
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
      <div className="flex flex-col gap-8">
        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Medium
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {(Object.keys(MEDIUM_LABELS) as Medium[]).map((medium) => (
              <OptionButton
                key={medium}
                label={MEDIUM_LABELS[medium]}
                selected={selection.medium === medium}
                onClick={() => setMedium(medium)}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Size
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(Object.keys(SIZE_LABELS) as Size[]).map((size) => (
              <OptionButton
                key={size}
                label={SIZE_LABELS[size]}
                selected={selection.size === size}
                onClick={() => setSize(size)}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Complexity
          </legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {(Object.keys(COMPLEXITY_LABELS) as Complexity[]).map((complexity) => (
              <OptionButton
                key={complexity}
                label={COMPLEXITY_LABELS[complexity]}
                selected={selection.complexity === complexity}
                onClick={() => setComplexity(complexity)}
              />
            ))}
          </div>
        </fieldset>

        <fieldset className="flex flex-col gap-3">
          <legend className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Add-ons
          </legend>
          <div className="flex flex-col gap-2">
            {ADD_ON_OPTIONS.map(({ key, label, hint }) => (
              <label
                key={key}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-zinc-200 bg-white px-4 py-3 text-sm text-zinc-700 hover:border-zinc-300 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300 dark:hover:border-zinc-700"
              >
                <span className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selection.addOns[key]}
                    onChange={() => toggleAddOn(key)}
                    className="h-4 w-4 rounded border-zinc-300 text-zinc-900 focus:ring-zinc-900 dark:border-zinc-700 dark:text-zinc-50"
                  />
                  {label}
                </span>
                <span className="text-zinc-400 dark:text-zinc-500">{hint}</span>
              </label>
            ))}
          </div>
        </fieldset>
      </div>

      <aside className="h-fit rounded-xl border border-zinc-200 bg-zinc-50 p-6 dark:border-zinc-800 dark:bg-zinc-900 lg:sticky lg:top-8">
        <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
          Estimate
        </h2>
        <ul className="mt-4 flex flex-col gap-2 text-sm text-zinc-600 dark:text-zinc-400">
          {breakdown.lineItems.map((item) => (
            <li key={item.label} className="flex justify-between gap-4">
              <span>{item.label}</span>
              <span className="shrink-0 tabular-nums">
                {currencyFormatter.format(item.amount)}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-4 flex items-baseline justify-between border-t border-zinc-200 pt-4 dark:border-zinc-800">
          <span className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Estimated total
          </span>
          <span className="text-2xl font-semibold tabular-nums text-zinc-900 dark:text-zinc-50">
            {currencyFormatter.format(breakdown.total)}
          </span>
        </div>
        <p className="mt-3 text-xs text-zinc-400 dark:text-zinc-500">
          This is an estimate. Final pricing is confirmed after reviewing your
          reference images and request details.
        </p>
      </aside>
    </div>
  );
}
