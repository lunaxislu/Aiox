export type RoutePolicy = "allow" | "deny";

export type DirectedRoute = {
    readonly from: string;
    readonly to: string;
    readonly policy: RoutePolicy;
};

/** Current effective routing snapshot, after any manifest/override resolution. */
export type Network = {
    readonly id: string;
    readonly defaultPolicy: RoutePolicy;
    /** The owner supplies at most one current policy per directed edge. */
    readonly routes: readonly DirectedRoute[];
};
