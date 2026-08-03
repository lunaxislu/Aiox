export const claudeMcpScopes = ["local", "user", "project"] as const;

export type ClaudeMcpScope = (typeof claudeMcpScopes)[number];
