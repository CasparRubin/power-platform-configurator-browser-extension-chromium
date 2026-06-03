import { useCallback, useEffect, useMemo, useRef, useState, type ChangeEvent } from "react";
import { readExtensionVersion } from "@helvety/extension-chrome/extension-version";
import { usePopupTheme } from "@helvety/extension-chrome/use-popup-theme";
import { Input } from "@helvety/ui/input";
import { Loader2, Search } from "lucide-react";
import { STORAGE_KEY_POPUP_THEME } from "../constants";
import { INSPECTOR_SHELL_CLASS } from "./inspector-shell";
import { ConnectionBar, type InspectorView } from "./components/ConnectionBar";
import { DebugLogPanel } from "./components/DebugLogPanel";
import { RunActionTree } from "./components/RunActionTree";
import { StatusChip } from "./components/StatusChip";
import {
  enrichActionWithContent,
  formatDuration,
  InspectorApiError,
  listCloudFlows,
  environmentFromId,
  listEnvironments,
  listFlowRuns,
  listRunActions,
  type InspectorCloudFlow,
  type InspectorEnvironment,
  type InspectorFlowRun,
  type InspectorRunAction,
} from "./flow-api";
import {
  getActiveTabContext,
  getSessionStatus,
  openConnectTab,
  syncFromActiveTab,
} from "./inspector-client";
import type { InspectorSessionStatusMessage } from "./session-bridge";
import { inspectorLog } from "./debug-log";
import { useInspectorDebugLog } from "./use-inspector-debug-log";

type NavState = {
  view: InspectorView;
  environment: InspectorEnvironment | null;
  flow: InspectorCloudFlow | null;
  run: InspectorFlowRun | null;
};

const INITIAL_NAV: NavState = {
  view: "environments",
  environment: null,
  flow: null,
  run: null,
};

const SESSION_POLL_INTERVAL_MS = 1_000;
const SESSION_POLL_MAX_ATTEMPTS = 12;

async function waitForInspectableSession(
  refresh: () => Promise<InspectorSessionStatusMessage>,
): Promise<InspectorSessionStatusMessage> {
  inspectorLog.info("session", "Waiting for session token (polling)…");
  let status = await refresh();
  for (let attempt = 0; attempt < SESSION_POLL_MAX_ATTEMPTS; attempt += 1) {
    if (status.hasToken) {
      inspectorLog.info("session", `Token available after poll attempt ${attempt}`, {
        debug: status.debug,
      });
      return status;
    }
    if (!status.bridgeTabId && status.connected === false) {
      inspectorLog.warn("session", "No bridge tab — stopping poll", { status });
      return status;
    }
    inspectorLog.debug(
      "session",
      `Poll ${attempt + 1}/${SESSION_POLL_MAX_ATTEMPTS}: no token yet`,
      {
        bridgeTabId: status.bridgeTabId,
        debug: status.debug,
      },
    );
    await new Promise((resolve) => setTimeout(resolve, SESSION_POLL_INTERVAL_MS));
    status = await refresh();
  }
  inspectorLog.warn("session", "Poll finished without token", { status });
  return status;
}

export default function App() {
  usePopupTheme(STORAGE_KEY_POPUP_THEME);
  const debugEntries = useInspectorDebugLog();
  const [nav, setNav] = useState<NavState>(INITIAL_NAV);
  const [session, setSession] = useState<InspectorSessionStatusMessage | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [environments, setEnvironments] = useState<InspectorEnvironment[]>([]);
  const [flows, setFlows] = useState<InspectorCloudFlow[]>([]);
  const [runs, setRuns] = useState<InspectorFlowRun[]>([]);
  const [actions, setActions] = useState<InspectorRunAction[]>([]);
  const [loadingAction, setLoadingAction] = useState<string | null>(null);
  const [version, setVersion] = useState("");
  const didAutoSyncRef = useRef(false);

  useEffect(() => {
    setVersion(readExtensionVersion());
    inspectorLog.info("app", "Flow Inspector panel opened");
  }, []);

  const refreshSession = useCallback(async () => {
    const status = await getSessionStatus();
    setSession(status);
    return status;
  }, []);

  const loadEnvironments = useCallback(async () => {
    setLoading(true);
    setError(null);
    inspectorLog.info("app", "Loading environments…");
    try {
      const sessionAfterPoll = await waitForInspectableSession(refreshSession);
      if (!sessionAfterPoll.hasToken) {
        inspectorLog.warn("app", "Proceeding without token — API call will likely fail");
      }
      const items = await listEnvironments();
      inspectorLog.info("app", `Loaded ${items.length} environment(s)`);
      setEnvironments(items);
    } catch (err) {
      const message = err instanceof InspectorApiError ? err.message : String(err);
      inspectorLog.error("app", `Load environments failed: ${message}`, err);
      const ctx = await getActiveTabContext();
      if (ctx.environmentId) {
        const fallback = environmentFromId(
          ctx.environmentId,
          "Current environment (from tab)",
          ctx.url,
        );
        setEnvironments([fallback]);
        setError(`${message} — showing the environment from your open Power Automate tab only.`);
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  }, [refreshSession]);

  const loadFlows = useCallback(
    async (environment: InspectorEnvironment) => {
      setLoading(true);
      setError(null);
      try {
        await refreshSession();
        const items = await listCloudFlows(environment.id);
        setFlows(items);
      } catch (err) {
        setError(err instanceof InspectorApiError ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [refreshSession],
  );

  const loadRuns = useCallback(
    async (environment: InspectorEnvironment, flow: InspectorCloudFlow) => {
      setLoading(true);
      setError(null);
      try {
        await refreshSession();
        const tabCtx = await getActiveTabContext();
        const items = await listFlowRuns(environment.id, flow.workflowId, {
          solutionId: tabCtx.solutionId,
        });
        setRuns(items);
      } catch (err) {
        setError(err instanceof InspectorApiError ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [refreshSession],
  );

  const loadRunDetail = useCallback(
    async (environment: InspectorEnvironment, flow: InspectorCloudFlow, run: InspectorFlowRun) => {
      setLoading(true);
      setError(null);
      try {
        await refreshSession();
        const items = await listRunActions(environment.id, flow.workflowId, run.id);
        setActions(items);
      } catch (err) {
        setError(err instanceof InspectorApiError ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    },
    [refreshSession],
  );

  const applyTabContext = useCallback(async () => {
    const ctx = await syncFromActiveTab();
    if (!ctx.environmentId) {
      setError("Active tab is not a Power Automate flow or run page.");
      return;
    }

    const env: InspectorEnvironment = {
      id: ctx.environmentId,
      displayName: ctx.environmentId,
      url: ctx.url,
    };
    setError(null);
    setSearch("");

    if (!ctx.flowId) {
      setNav({ view: "flows", environment: env, flow: null, run: null });
      await loadFlows(env);
      return;
    }

    const matchedFlow: InspectorCloudFlow = {
      workflowId: ctx.flowId,
      name: ctx.flowId,
      state: null,
      modifiedOn: null,
    };
    setFlows([matchedFlow]);

    setLoading(true);
    try {
      await refreshSession();

      if (!ctx.runId) {
        setNav({ view: "runs", environment: env, flow: matchedFlow, run: null });
        const runItems = await listFlowRuns(env.id, matchedFlow.workflowId, {
          solutionId: ctx.solutionId,
        });
        setRuns(runItems);
        return;
      }

      const runItems = await listFlowRuns(env.id, matchedFlow.workflowId, {
        solutionId: ctx.solutionId,
      });
      setRuns(runItems);
      const matchedRun =
        runItems.find((r) => r.id === ctx.runId) ??
        ({
          id: ctx.runId,
          name: ctx.runId,
          status: "Unknown",
          startTime: null,
          endTime: null,
        } satisfies InspectorFlowRun);

      setNav({
        view: "run-detail",
        environment: env,
        flow: matchedFlow,
        run: matchedRun,
      });
      const actionItems = await listRunActions(env.id, matchedFlow.workflowId, matchedRun.id);
      setActions(actionItems);
    } catch (err) {
      setError(err instanceof InspectorApiError ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }, [loadFlows, refreshSession]);

  useEffect(() => {
    void (async () => {
      await loadEnvironments();
      if (didAutoSyncRef.current) {
        return;
      }
      didAutoSyncRef.current = true;
      const ctx = await getActiveTabContext();
      if (ctx.environmentId && ctx.flowId) {
        void applyTabContext();
      }
    })();
  }, [applyTabContext, loadEnvironments]);

  const onSelectEnvironment = useCallback(
    (environment: InspectorEnvironment) => {
      setSearch("");
      setNav({ view: "flows", environment, flow: null, run: null });
      void loadFlows(environment);
    },
    [loadFlows],
  );

  const onSelectFlow = useCallback(
    (flow: InspectorCloudFlow) => {
      if (!nav.environment) {
        return;
      }
      setSearch("");
      setNav((prev) => ({ ...prev, view: "runs", flow, run: null }));
      void loadRuns(nav.environment, flow);
    },
    [loadRuns, nav.environment],
  );

  const onSelectRun = useCallback(
    (run: InspectorFlowRun) => {
      if (!nav.environment || !nav.flow) {
        return;
      }
      setNav((prev) => ({ ...prev, view: "run-detail", run }));
      void loadRunDetail(nav.environment!, nav.flow!, run);
    },
    [loadRunDetail, nav.environment, nav.flow],
  );

  const onBack = useCallback(() => {
    setError(null);
    setSearch("");
    if (nav.view === "run-detail") {
      setNav((prev) => ({ ...prev, view: "runs", run: null }));
      setActions([]);
      return;
    }
    if (nav.view === "runs") {
      setNav((prev) => ({ ...prev, view: "flows", flow: null }));
      setRuns([]);
      return;
    }
    if (nav.view === "flows") {
      setNav(INITIAL_NAV);
      setFlows([]);
    }
  }, [nav.view]);

  const onRefresh = useCallback(() => {
    if (nav.view === "environments") {
      void loadEnvironments();
      return;
    }
    if (nav.view === "flows" && nav.environment) {
      void loadFlows(nav.environment);
      return;
    }
    if (nav.view === "runs" && nav.environment && nav.flow) {
      void loadRuns(nav.environment, nav.flow);
      return;
    }
    if (nav.view === "run-detail" && nav.environment && nav.flow && nav.run) {
      void loadRunDetail(nav.environment, nav.flow, nav.run);
    }
  }, [loadEnvironments, loadFlows, loadRunDetail, loadRuns, nav]);

  const onExpandAction = useCallback(
    async (actionName: string) => {
      if (!nav.environment || !nav.flow || !nav.run) {
        return;
      }
      const existing = actions.find((a) => a.name === actionName);
      if (existing?.inputs || existing?.outputs) {
        return;
      }
      setLoadingAction(actionName);
      try {
        const enriched = await enrichActionWithContent(
          existing ?? {
            name: actionName,
            status: "Unknown",
            startTime: null,
            endTime: null,
            error: null,
            inputsLink: null,
            outputsLink: null,
            inputs: null,
            outputs: null,
            code: null,
          },
          nav.environment.id,
          nav.flow.workflowId,
          nav.run.id,
        );
        setActions((prev) => prev.map((a) => (a.name === actionName ? enriched : a)));
      } finally {
        setLoadingAction(null);
      }
    },
    [actions, nav.environment, nav.flow, nav.run],
  );

  const breadcrumb = useMemo(() => {
    const parts = ["Environments"];
    if (nav.environment) {
      parts.push(nav.environment.displayName);
    }
    if (nav.flow) {
      parts.push(nav.flow.name);
    }
    if (nav.run) {
      parts.push(`Run ${nav.run.id.slice(0, 12)}…`);
    }
    return parts.join(" › ");
  }, [nav.environment, nav.flow, nav.run]);

  const filteredEnvironments = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return environments;
    }
    return environments.filter(
      (e) => e.displayName.toLowerCase().includes(q) || e.id.toLowerCase().includes(q),
    );
  }, [environments, search]);

  const filteredFlows = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return flows;
    }
    return flows.filter((f) => f.name.toLowerCase().includes(q));
  }, [flows, search]);

  const filteredRuns = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) {
      return runs;
    }
    return runs.filter((r) => r.id.toLowerCase().includes(q) || r.status.toLowerCase().includes(q));
  }, [runs, search]);

  const canGoBack = nav.view !== "environments";

  return (
    <div className={INSPECTOR_SHELL_CLASS}>
      <ConnectionBar
        session={session}
        view={nav.view}
        breadcrumb={breadcrumb}
        loading={loading}
        onBack={onBack}
        onRefresh={onRefresh}
        onSyncTab={() => void applyTabContext()}
        onConnect={() => void openConnectTab()}
        canGoBack={canGoBack}
      />

      <div className="border-b px-3 py-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e: ChangeEvent<HTMLInputElement>) => setSearch(e.target.value)}
            placeholder={
              nav.view === "environments"
                ? "Search environments…"
                : nav.view === "flows"
                  ? "Search flows…"
                  : "Search runs…"
            }
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {error ? (
        <div className="mx-3 mt-2 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-xs text-destructive">
          {error}
        </div>
      ) : null}

      <main className="popup-tab-scroll min-h-0 flex-1 overflow-y-auto overflow-x-hidden">
        {loading && nav.view !== "run-detail" ? (
          <div className="flex items-center justify-center gap-2 py-12 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            Loading…
          </div>
        ) : null}

        {nav.view === "environments" && !loading ? (
          <ul className="divide-y">
            {filteredEnvironments.map((env) => (
              <li key={env.id}>
                <button
                  type="button"
                  className="w-full px-3 py-3 text-left hover:bg-muted/50"
                  onClick={() => onSelectEnvironment(env)}
                >
                  <p className="truncate text-sm font-medium">{env.displayName}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{env.id}</p>
                </button>
              </li>
            ))}
            {filteredEnvironments.length === 0 ? (
              <li className="px-3 py-8 text-center text-sm text-muted-foreground">
                No environments found.
              </li>
            ) : null}
          </ul>
        ) : null}

        {nav.view === "flows" && !loading ? (
          <ul className="divide-y">
            {filteredFlows.map((flow) => (
              <li key={flow.workflowId}>
                <button
                  type="button"
                  className="w-full px-3 py-3 text-left hover:bg-muted/50"
                  onClick={() => onSelectFlow(flow)}
                >
                  <p className="truncate text-sm font-medium">{flow.name}</p>
                  <p className="mt-0.5 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                    {flow.state ? <span>{flow.state}</span> : null}
                    {flow.modifiedOn ? <span>{flow.modifiedOn}</span> : null}
                  </p>
                </button>
              </li>
            ))}
            {filteredFlows.length === 0 ? (
              <li className="px-3 py-8 text-center text-sm text-muted-foreground">
                No flows found in this environment.
              </li>
            ) : null}
          </ul>
        ) : null}

        {nav.view === "runs" && !loading ? (
          <ul className="divide-y">
            {filteredRuns.map((run) => (
              <li key={run.id}>
                <button
                  type="button"
                  className="w-full px-3 py-3 text-left hover:bg-muted/50"
                  onClick={() => onSelectRun(run)}
                >
                  <div className="flex items-center gap-2">
                    <StatusChip status={run.status} />
                    <span className="truncate text-[11px] text-muted-foreground">
                      {formatDuration(run.startTime, run.endTime)}
                    </span>
                  </div>
                  <p className="mt-1 truncate text-xs font-medium">{run.id}</p>
                  <p className="text-[11px] text-muted-foreground">{run.startTime ?? "—"}</p>
                </button>
              </li>
            ))}
            {filteredRuns.length === 0 ? (
              <li className="px-3 py-8 text-center text-sm text-muted-foreground">
                No runs found for this flow.
              </li>
            ) : null}
          </ul>
        ) : null}

        {nav.view === "run-detail" ? (
          <div className="flex min-h-0 flex-1 flex-col">
            {nav.run ? (
              <div className="border-b px-3 py-2">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusChip status={nav.run.status} />
                  <span className="text-[11px] text-muted-foreground">
                    {formatDuration(nav.run.startTime, nav.run.endTime)}
                  </span>
                </div>
                <p className="mt-1 text-[11px] text-muted-foreground">{nav.run.startTime ?? "—"}</p>
              </div>
            ) : null}
            {loading ? (
              <div className="flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground">
                <Loader2 className="h-4 w-4 animate-spin" />
                Loading run…
              </div>
            ) : (
              <RunActionTree
                actions={actions}
                loadingAction={loadingAction}
                onExpandAction={onExpandAction}
              />
            )}
          </div>
        ) : null}
      </main>

      <DebugLogPanel
        entries={debugEntries}
        session={session}
        defaultExpanded={!session?.hasToken || Boolean(error)}
      />

      <footer className="shrink-0 border-t px-3 py-1.5 text-[10px] text-muted-foreground">
        Flow Inspector v{version} · read-only · uses your Power Automate session
      </footer>
    </div>
  );
}
