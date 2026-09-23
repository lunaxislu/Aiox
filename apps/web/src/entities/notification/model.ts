import type { WebNotificationView } from "@aiox/protocol";

import type { PanelPreview } from "@/entities/panel/model";

/** 최신이 위. 서버가 미는 배열은 오름차순 그대로 두고 표시용 복사본만 정렬한다. */
export function byNewest(notifications: readonly WebNotificationView[]) {
    return [...notifications].sort((a, b) => b.createdAt - a.createdAt);
}

const formatter = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const units = [
    ["day", 86_400_000],
    ["hour", 3_600_000],
    ["minute", 60_000],
] as const;

/** `createdAt`은 epoch 밀리초다. 경과를 누적하지 않고 매번 실제 차이를 계산한다. */
export function relativeTime(createdAt: number, now: number) {
    const elapsed = createdAt - now;
    for (const [unit, size] of units)
        if (Math.abs(elapsed) >= size)
            return formatter.format(Math.round(elapsed / size), unit);
    return formatter.format(0, "second");
}

/**
 * 이동 대상은 알림을 보낸 그 실행이다. 탭의 `runtimeId`는 살아 있는 실행에서만 차므로
 * 실행이 끝나면 여기서 빈다. `terminalId`로 대체 탐색하지 않는다.
 */
export function findRuntimeTab(
    panels: readonly PanelPreview[],
    originRuntimeId: string,
) {
    for (const panel of panels) {
        const tab = panel.tabs.find(
            (item) => item.runtimeId === originRuntimeId,
        );
        if (tab) return { panel, tab };
    }
    return null;
}

/** 이름은 지금 있는 실행에서만 가져온다. 사라졌으면 본문과 시각만 남는다. */
export function agentName(
    panels: readonly PanelPreview[],
    originRuntimeId: string,
) {
    for (const panel of panels) {
        const agent = panel.agents.find((item) => item.id === originRuntimeId);
        if (agent) return agent.name;
    }
    return null;
}
