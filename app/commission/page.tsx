import type { Metadata } from 'next';

import { PricingCalculator } from '@/components/commission/pricing-calculator';

export const metadata: Metadata = {
  title: 'Commission a Piece',
  description: 'Get an instant estimate and request a custom art commission.',
};

export default function CommissionPage() {
  return (
    <div className="mx-auto w-full max-w-4xl px-6 py-16 sm:px-8">
      <div className="mb-10 flex flex-col gap-2">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Commission a Piece
        </h1>
        <p className="text-zinc-600 dark:text-zinc-400">
          Choose your options below for an instant price estimate, then submit
          your request.
        </p>
      </div>
      <PricingCalculator />
    </div>
  );
}
