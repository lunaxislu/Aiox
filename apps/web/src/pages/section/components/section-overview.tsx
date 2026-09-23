import { type PanelPreview, type Section } from "@/entities/panel/model";
import { SectionOverviewCard } from "@/entities/panel/section-overview-card";

import { SectionOverviewEmpty } from "./section-overview-empty";

export function SectionOverview({
    section,
    panels,
    onCreate,
}: {
    section: Section;
    panels: PanelPreview[];
    onCreate: (section: Section) => void;
}) {
    if (panels.length === 0) {
        return (
            <SectionOverviewEmpty
                section={section}
                onCreate={() => onCreate(section)}
            />
        );
    }
    // 패딩은 페이지가 소유한다. 여기서 또 걸면 섹션 헤더와 좌측 기준선이 어긋난다.
    return (
        <div className="grid grid-cols-1 gap-2 md:gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
            {panels.map((panel) => (
                <SectionOverviewCard key={panel.id} panel={panel} />
            ))}
        </div>
    );
}
