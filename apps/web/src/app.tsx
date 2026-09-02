import { useSyncExternalStore } from "react";

import type { GatewayStore } from "./gateway-store.js";
import "./styles.css";

export function App({ store }: { store: GatewayStore }) {
  const state = useSyncExternalStore(store.subscribe, store.getState);
  const lifecycle = state.snapshot?.server.lifecycle ?? "unavailable";
  const connected = state.connection === "connected";
  const canStop = connected && lifecycle === "running" && !state.stopPending;

  const requestStop = (force: boolean): void => {
    if (
      force &&
      !window.confirm(
        "Force bypasses only active-dependency rejection. It does not stop external runtimes. Continue?",
      )
    ) {
      return;
    }
    void store.requestServerStop(force).catch(() => {});
  };

  return (
    <main className="shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="AIOX control home">
          <span className="brand-mark">A</span>
          <span>AIOX</span>
        </a>
        <div
          className={`connection connection--${state.connection}`}
          data-connection={state.connection}
          aria-live="polite"
        >
          <span className="connection-dot" aria-hidden="true" />
          {state.connection === "reconnecting"
            ? "Reconnecting"
            : state.connection}
        </div>
      </header>

      <section className="hero">
        <p className="eyebrow">LOCAL CONTROL PLANE</p>
        <h1>Orchestration,<br />clearly in view.</h1>
        <p className="hero-copy">
          One authoritative server projection. No optimistic lifecycle guesses.
        </p>
      </section>

      <section className="control-grid" aria-label="Local Server control">
        <article className="server-card">
          <div className="card-heading">
            <div>
              <p className="card-kicker">LOCAL SERVER</p>
              <h2>{lifecycle}</h2>
            </div>
            <span className={`lifecycle lifecycle--${lifecycle}`}>{lifecycle}</span>
          </div>

          <dl className="metrics">
            <div>
              <dt>Epoch</dt>
              <dd>{state.snapshot?.server.epoch ?? "—"}</dd>
            </div>
            <div>
              <dt>State version</dt>
              <dd>{state.snapshot?.stateVersion ?? "—"}</dd>
            </div>
            <div>
              <dt>Next event</dt>
              <dd>{state.snapshot?.nextEventSeq ?? "—"}</dd>
            </div>
          </dl>

          <div className="actions">
            <button
              className="button button--primary"
              disabled={!canStop}
              onClick={() => requestStop(false)}
            >
              {state.stopPending ? "Request pending…" : "Stop server"}
            </button>
            <button
              className="button button--quiet"
              disabled={!canStop}
              onClick={() => requestStop(true)}
            >
              Force stop
            </button>
          </div>
        </article>

        <aside className="signal-card">
          <p className="card-kicker">CONNECTION SIGNAL</p>
          <h2>
            {state.connection === "connected"
              ? "Live projection"
              : state.connection === "reconnecting"
                ? "Reconnecting"
                : "Awaiting authority"}
          </h2>
          <p>
            Snapshot replacement and ordered events keep this view aligned with the
            Local Server.
          </p>
          <div className="signal-line" aria-hidden="true">
            <span />
          </div>
          {state.lastStopResult && !state.lastStopResult.accepted ? (
            <p className="notice">
              Stop blocked by {state.lastStopResult.blockers.length} active
              {state.lastStopResult.blockers.length === 1 ? " dependency" : " dependencies"}.
            </p>
          ) : null}
          {state.error ? <p className="error-notice">{state.error}</p> : null}
        </aside>
      </section>

      <footer>
        <span>Stage 2 · Gateway bootstrap</span>
        <span>Loopback only</span>
      </footer>
    </main>
  );
}
