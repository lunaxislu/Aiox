import type { AioxConfig, Ports } from "@/schema";
import { parseConfig } from "@/schema";

export type ConfigSnapshot = {
    effective: AioxConfig;
    pendingPorts: Ports;
    restartRequired: boolean;
};

/** File watchers call reload; listener ports stay fixed until the next startup. */
export function createConfigSession(initial: unknown) {
    let current = parseConfig(initial);
    const startupPorts = { ...current.ports };
    function snapshot(): ConfigSnapshot {
        return {
            effective: { ...parseConfig(current), ports: { ...startupPorts } },
            pendingPorts: { ...current.ports },
            restartRequired:
                current.ports.daemon !== startupPorts.daemon ||
                current.ports.web !== startupPorts.web,
        };
    }
    return {
        snapshot,
        reload(candidate: unknown): ConfigSnapshot {
            current = parseConfig(candidate);
            return snapshot();
        },
    };
}
