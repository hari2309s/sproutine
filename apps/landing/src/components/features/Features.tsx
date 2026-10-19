import { SectionHeading } from '../ui'
import {
  CalendarCard,
  CalendarExportCard,
  GoalsCard,
  OnThisDayCard,
  PlanCard,
  StreakCard,
} from './InsightCards'
import { PhotoCard, ScanCard, SearchCard, TalkCard } from './LoggingCards'

export function Features() {
  return (
    <section
      id="features"
      className="mx-auto flex max-w-[1200px] flex-col gap-[clamp(32px,4vw,48px)] px-[clamp(20px,5vw,48px)] pt-[clamp(72px,10vw,128px)]"
    >
      <SectionHeading
        eyebrow="Features"
        title="Everything you need, nothing that nags."
        lead="Logging, planning and a little gentle insight, all in one calm place."
      />
      <div className="flex flex-wrap gap-5">
        <SearchCard />
        <ScanCard />
        <TalkCard />
        <PhotoCard />
        <PlanCard />
        <CalendarCard />
        <StreakCard />
        <GoalsCard />
        <CalendarExportCard />
        <OnThisDayCard />
      </div>
    </section>
  )
}
