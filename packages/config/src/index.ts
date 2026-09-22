export {
    ConfigError,
    DEFAULT_RETENTION_DAYS,
    parseConfig,
    parseHostLayout,
    resolveHostLayout,
} from "@/schema";
export type { AioxConfig, Ports, PortOverrides, HostLayout } from "@/schema";
export { configPath, loadConfig, saveConfig } from "@/files";
export type { ConfigLocation } from "@/files";
export { createConfigSession } from "@/session";
export type { ConfigSnapshot } from "@/session";

export { resolveTerminalLaunch } from "@/terminal";
export type { TerminalLaunch } from "@/terminal";
export {
    HostInputError,
    parseHostManifest,
    loadHostManifest,
    prepareHostInput,
} from "@/host";
export type { HostSource, HostManifest } from "@/host";

export { createConfigDocument, ConfigConflictError } from "./document";
