import { useOutletContext } from "react-router";

import type { AppOutletContext } from "@/app/app-shell";
import { sectionLabels, sections } from "@/entities/panel/model";

import { SectionOverview } from "../section/components/section-overview";

export function OverviewPage() {
    const { panels, onCreate } = useOutletContext<AppOutletContext>();
    return (
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-6 p-4 md:p-6">
            {sections.map((section) => {
                const sectionPanels = panels.filter(
                    (panel) => panel.section === section,
                );
                return (
                    <section key={section} aria-label={sectionLabels[section]}>
                        <h2 className="mb-2 text-xs font-medium tracking-wider text-muted-foreground uppercase">
                            {sectionLabels[section]}
                        </h2>
                        <SectionOverview
                            section={section}
                            panels={sectionPanels}
                            onCreate={onCreate}
                        />
                    </section>
                );
            })}
        </div>
    );
}
