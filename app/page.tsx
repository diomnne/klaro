import { HeroSection } from '@/components/hero-section';

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center">
      <main className="flex w-full max-w-5xl flex-1 flex-col justify-center px-6 pb-16 sm:px-16">
        <HeroSection />
      </main>
    </div>
  );
}
