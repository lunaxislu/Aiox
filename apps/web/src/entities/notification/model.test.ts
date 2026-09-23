import type { WebNotificationView } from "@aiox/protocol";
import { describe, expect, it } from "vitest";

import {
    agentName,
    byNewest,
    findRuntimeTab,
    relativeTime,
} from "@/entities/notification/model";
import { previewPanels } from "@/entities/panel/fixtures";

const notification = (id: string, createdAt: number): WebNotificationView => ({
    id,
    originRuntimeId: `runtime-${id}`,
    terminalId: null,
    body: id,
    createdAt,
    readAt: null,
});

describe("byNewest", () => {
    it("서버의 오름차순을 뒤집어 최신을 맨 위에 둔다", () => {
        const server = [notification("old", 1), notification("new", 2)];
        expect(byNewest(server).map((item) => item.id)).toEqual(["new", "old"]);
    });

    it("서버가 미는 배열 자체는 바꾸지 않는다", () => {
        const server = [notification("old", 1), notification("new", 2)];
        byNewest(server);
        expect(server.map((item) => item.id)).toEqual(["old", "new"]);
    });
});

describe("relativeTime", () => {
    const now = Date.UTC(2026, 8, 23, 12, 0, 0);

    it("1분 미만은 now로 보인다", () => {
        expect(relativeTime(now - 30_000, now)).toBe("now");
    });

    it("분·시간·일 단위로 올라간다", () => {
        expect(relativeTime(now - 5 * 60_000, now)).toBe("5 minutes ago");
        expect(relativeTime(now - 3 * 3_600_000, now)).toBe("3 hours ago");
        expect(relativeTime(now - 2 * 86_400_000, now)).toBe("2 days ago");
    });

    it("누적이 아니라 그때의 실제 차이를 쓴다", () => {
        const createdAt = now - 60_000;
        expect(relativeTime(createdAt, now)).toBe("1 minute ago");
        expect(relativeTime(createdAt, now + 30 * 60_000)).toBe(
            "31 minutes ago",
        );
    });
});

describe("findRuntimeTab", () => {
    it("runtimeId가 같은 탭과 그 panel을 찾는다", () => {
        const found = findRuntimeTab(previewPanels, "runtime-reviewer");
        expect(found?.tab.id).toBe("reviewer");
        expect(found?.panel.id).toBe("main");
    });

    it("실행이 사라진 탭은 runtimeId가 비어 찾히지 않는다", () => {
        expect(findRuntimeTab(previewPanels, "runtime-crashed")).toBeNull();
    });

    it("terminalId로 대체 탐색하지 않는다", () => {
        expect(findRuntimeTab(previewPanels, "terminal-reviewer")).toBeNull();
    });
});

describe("agentName", () => {
    it("지금 있는 실행의 이름을 쓴다", () => {
        expect(agentName(previewPanels, "runtime-reviewer")).toBe("reviewer");
    });

    it("사라진 실행은 이름이 없다", () => {
        expect(agentName(previewPanels, "runtime-crashed")).toBeNull();
    });
});
