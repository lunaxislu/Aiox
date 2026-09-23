import { useOutletContext, useParams } from "react-router";

import type { AppOutletContext } from "@/app/app-shell";
import { isSection } from "@/entities/panel/model";
import { NotFoundPage } from "@/pages/not-found/not-found-page";

import { SectionOverview } from "./components/section-overview";

export function SectionOverviewPage() {
    const { section } = useParams();
    const { panels, onCreate } = useOutletContext<AppOutletContext>();

    if (!isSection(section)) return <NotFoundPage />;

    const items = panels.filter((panel) => panel.section === section);

    // 섹션 하나만 보는 화면이라 빈 상태가 메인 높이 전체에서 가운데로 간다.
    return (
        <div className="mx-auto flex min-h-full w-full max-w-6xl flex-col p-4 md:p-6">
            <SectionOverview
                section={section}
                panels={items}
                onCreate={onCreate}
            />
        </div>
    );
}
