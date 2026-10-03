import CallToAction from '@/components/CallToAction';
import FiatBand from '@/components/FiatBand';
import Hero from '@/components/Hero';
import HowItWorks from '@/components/HowItWorks';
import ModeMilestones from '@/components/ModeMilestones';
import ModeStreaming from '@/components/ModeStreaming';
import Problem from '@/components/Problem';
import SiteFooter from '@/components/SiteFooter';
import SiteHeader from '@/components/SiteHeader';
import WhyMonad from '@/components/WhyMonad';

export default function Home() {
  return (
    <>
      <SiteHeader />
      <main>
        <Hero />
        <Problem />
        <ModeStreaming />
        <ModeMilestones />
        <FiatBand />
        <HowItWorks />
        <WhyMonad />
        <CallToAction />
      </main>
      <SiteFooter />
    </>
  );
}