import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import {
  Activity,
  ArrowUpRight,
  Bot,
  Braces,
  CalendarClock,
  Check,
  CircleAlert,
  Code2,
  Command,
  Eye,
  Inbox,
  Link2,
  LogOut,
  RefreshCw,
  Send,
  Settings2,
  X,
  Zap,
} from 'lucide-react';
import {
  getGetBotStatusQueryKey,
  getListBotGuildsQueryKey,
  getListGuildChannelsQueryKey,
  getListMessageSchedulesQueryKey,
  useConnectBot,
  useDisconnectBot,
  useGetBotStatus,
  useListBotGuilds,
  useListGuildChannels,
  useListMessageSchedules,
  useScheduleLayoutMessage,
  useSendLayoutMessage,
  setBaseUrl,
  type Guild,
  type MessageActivity,
} from '@workspace/api-client-react';
import { ErrorBoundary } from '@/components/error-boundary';
import { Toaster } from '@/components/ui/toaster';
import { TooltipProvider } from '@/components/ui/tooltip';
import NotFound from '@/pages/not-found';
import { Route, Switch, Router as WouterRouter, useLocation } from 'wouter';

setBaseUrl(import.meta.env.VITE_API_BASE_URL?.trim() || null);

const queryClient = new QueryClient();

const starterCode = `{
  "components": [
    {
      "type": 17,
      "accent_color": 6540786,
      "components": [
        {
          "type": 10,
          "content": "## Release notes / v2.4"
        },
        {
          "type": 10,
          "content": "A quieter, faster way to ship your next update."
        },
        { "type": 14, "divider": true, "spacing": 1 },
        {
          "type": 1,
          "components": [
            { "type": 2, "style": 1, "label": "Read the notes", "custom_id": "read_notes" },
            { "type": 2, "style": 2, "label": "View changelog", "custom_id": "view_changelog" }
          ]
        }
      ]
    }
  ]
}`;

function formatDate(value: string | null | undefined) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(date);
}

type LayoutComponent = {
  type?: number;
  content?: string;
  accent_color?: number;
  divider?: boolean;
  spacing?: number;
  label?: string;
  style?: number;
  components?: LayoutComponent[];
};

function layoutComponents(code: string): LayoutComponent[] {
  try {
    const parsed = JSON.parse(code) as Record<string, unknown>;
    return Array.isArray(parsed.components) ? parsed.components as LayoutComponent[] : [];
  } catch {
    return [];
  }
}

function layoutFromCode(code: string) {
  try {
    return JSON.parse(code) as Record<string, unknown>;
  } catch {
    return { content: code };
  }
}

function renderComponent(component: LayoutComponent, key: string): ReactNode {
  if (component.type === 17) {
    return (
      <div className="layout-container" key={key} style={{ borderLeftColor: component.accent_color ? `#${component.accent_color.toString(16).padStart(6, '0')}` : '#63dff2' }}>
        {(component.components ?? []).map((child, index) => renderComponent(child, `${key}-${index}`))}
      </div>
    );
  }

  if (component.type === 10) {
    return <div className="layout-text" key={key}>{(component.content ?? '').split('\n').map((line, index) => <div key={`${key}-${index}`}>{line}</div>)}</div>;
  }

  if (component.type === 14) {
    return <div className="layout-separator" key={key} />;
  }

  if (component.type === 1) {
    return (
      <div className="layout-action-row" key={key}>
        {(component.components ?? []).map((button, index) => (
          <div className={`layout-button style-${button.style ?? 2}`} key={`${key}-${index}`}>{button.label ?? 'Button'}</div>
        ))}
      </div>
    );
  }

  if (component.type === 9) {
    return (
      <div className="layout-section" key={key}>
        <div className="layout-text">{component.content ?? 'Section'}</div>
        {(component.components ?? []).map((child, index) => renderComponent(child, `${key}-${index}`))}
      </div>
    );
  }

  if (component.type === 12) {
    return <div className="layout-media-placeholder" key={key}>Media gallery</div>;
  }

  return <div className="layout-unknown" key={key}>Component type {component.type ?? 'unknown'}</div>;
}

function LayoutPreview({ code }: { code: string }) {
  const components = layoutComponents(code);
  if (!components.length) {
    return <div className="layout-empty-preview">Add a valid LayoutView object with a components array.</div>;
  }

  return <div className="layout-rendered">{components.map((component, index) => renderComponent(component, `component-${index}`))}</div>;
}

function Home() {
  const qc = useQueryClient();
  const [code, setCode] = useState(starterCode);
  const [selectedGuildId, setSelectedGuildId] = useState('');
  const [selectedChannelId, setSelectedChannelId] = useState('');
  const [scheduleDate, setScheduleDate] = useState('');
  const [token, setToken] = useState('');
  const [isConnectOpen, setIsConnectOpen] = useState(false);
  const [localActivity, setLocalActivity] = useState<MessageActivity[]>([]);
  const [notice, setNotice] = useState('');

  const botQuery = useGetBotStatus({ query: { queryKey: getGetBotStatusQueryKey() } });
  const botStatus = botQuery.data;
  const guildsQuery = useListBotGuilds({
    query: { queryKey: getListBotGuildsQueryKey(), enabled: Boolean(botStatus?.connected) },
  });
  const guilds = guildsQuery.data ?? [];
  const channelsQuery = useListGuildChannels(selectedGuildId, {
    query: { queryKey: getListGuildChannelsQueryKey(selectedGuildId), enabled: Boolean(selectedGuildId) },
  });
  const channels = channelsQuery.data ?? [];
  const schedulesQuery = useListMessageSchedules({
    query: { queryKey: getListMessageSchedulesQueryKey() },
  });
  const remoteActivity = schedulesQuery.data ?? [];
  const activity = useMemo(() => [...localActivity, ...remoteActivity].slice(0, 8), [localActivity, remoteActivity]);
  const connectBot = useConnectBot();
  const disconnectBot = useDisconnectBot();
  const sendMessage = useSendLayoutMessage();
  const scheduleMessage = useScheduleLayoutMessage();

  useEffect(() => {
    if (!selectedGuildId && guilds[0]) setSelectedGuildId(guilds[0].id);
  }, [guilds, selectedGuildId]);

  useEffect(() => {
    if (selectedChannelId && channels.some((channel) => channel.id === selectedChannelId)) return;
    setSelectedChannelId(channels[0]?.id ?? '');
  }, [channels, selectedChannelId]);

  const showNotice = (message: string) => {
    setNotice(message);
    window.setTimeout(() => setNotice(''), 4200);
  };

  const handleConnect = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (token.trim().length < 20) return;
    connectBot.mutate({ data: { token: token.trim() } }, {
      onSuccess: (status) => {
        qc.setQueryData(getGetBotStatusQueryKey(), status);
        setIsConnectOpen(false);
        setToken('');
        showNotice('Bot connected. Your servers are ready.');
      },
    });
  };

  const handleDisconnect = () => {
    disconnectBot.mutate(undefined, {
      onSuccess: (status) => {
        qc.setQueryData(getGetBotStatusQueryKey(), status);
        setSelectedGuildId('');
        setSelectedChannelId('');
        showNotice('Bot disconnected.');
      },
    });
  };

  const sendPayload = () => {
    if (!selectedGuildId || !selectedChannelId) return;
    sendMessage.mutate({
      data: { guildId: selectedGuildId, channelId: selectedChannelId, layout: layoutFromCode(code), code },
    }, {
      onSuccess: (result) => {
        setLocalActivity((items) => [result, ...items]);
        showNotice('LayoutView sent to the channel.');
      },
      onError: () => showNotice('Send failed. Check the bot permission and channel access.'),
    });
  };

  const schedulePayload = () => {
    if (!selectedGuildId || !selectedChannelId || !scheduleDate) return;
    scheduleMessage.mutate({
      data: {
        guildId: selectedGuildId,
        channelId: selectedChannelId,
        layout: layoutFromCode(code),
        code,
        scheduledFor: new Date(scheduleDate).toISOString(),
      },
    }, {
      onSuccess: (result) => {
        setScheduleDate('');
        showNotice('Message scheduled.');
        qc.invalidateQueries({ queryKey: getListMessageSchedulesQueryKey() });
      },
      onError: () => showNotice('Schedule failed. Check the selected time and destination.'),
    });
  };

  const isParsing = code.trim().startsWith('{') && (() => { try { JSON.parse(code); return true; } catch { return false; } })();
  const isLayoutView = isParsing && layoutComponents(code).length > 0;
  const canSend = Boolean(botStatus?.connected && selectedGuildId && selectedChannelId && isLayoutView);

  return (
    <div className="sender-app">
      <div className="ambient-orb one" />
      <div className="ambient-orb two" />
      <div className="app-shell">
        <aside className="sidebar">
          <div className="brand">
            <div className="brand-mark"><Command /></div>
            <div className="brand-name">LAYOUTVIEW<span>SENDER CONSOLE</span></div>
          </div>
          <div className="nav-label">Workspace</div>
          <button className="nav-item active" data-testid="button-nav-workspace" type="button"><Braces /><span>Composer</span></button>
          <button className="nav-item" data-testid="button-nav-activity" type="button" onClick={() => document.getElementById('activity')?.scrollIntoView({ behavior: 'smooth' })}><Activity /><span>Activity</span><span className="nav-count">{activity.length || '—'}</span></button>
          <button className="nav-item" data-testid="button-nav-settings" type="button" onClick={() => showNotice('Workspace settings are coming from your bot connection.')}><Settings2 /><span>Settings</span></button>
          <div className="sidebar-spacer" />
          <div className="bot-card">
            <div className="bot-card-head"><span>Bot link</span><span className={`bot-indicator ${botStatus?.connected ? '' : 'offline'}`}><i className="status-dot" />{botStatus?.connected ? 'Online' : 'Offline'}</span></div>
            <div className="bot-name">{botStatus?.connected ? botStatus.username ?? 'Connected bot' : 'No bot connected'}</div>
            <div className="bot-meta">{botStatus?.connected ? `${botStatus.guildCount} servers visible` : 'Connect to start sending'}</div>
          </div>
          <div className="sidebar-foot"><span>API LINK</span><span className="version">v0.8.4</span></div>
        </aside>

        <main className="content">
          <header className="topbar intro">
            <div>
              <div className="eyebrow"><span className="eyebrow-line" />Command center / 01</div>
              <h1 className="page-title">Compose, preview, send.</h1>
              <p className="page-subtitle">Turn LayoutView code into a message your community can see.</p>
            </div>
            <div className="top-actions">
              <span className="clock">LIVE WORKSPACE</span>
              {botStatus?.connected ? (
                <button className="ghost-btn" data-testid="button-disconnect-bot" type="button" onClick={handleDisconnect} disabled={disconnectBot.isPending}><LogOut /><span>{disconnectBot.isPending ? 'Disconnecting' : 'Disconnect'}</span></button>
              ) : (
                <button className="action-btn secondary" data-testid="button-connect-bot" type="button" onClick={() => setIsConnectOpen(true)}><Link2 /><span>Connect bot</span></button>
              )}
            </div>
          </header>

          <section className="workspace">
            <article className="panel code-panel intro stagger-1">
              <div className="panel-head">
                <div className="panel-title"><Code2 />LayoutView source</div>
                <span className="panel-kicker">Input / JSON</span>
              </div>
              <div className="editor-toolbar">
                <div className="editor-tab"><i className="file-dot" />message.layout.json</div>
                <span className="editor-help">Paste your component object</span>
              </div>
              <textarea
                className="code-area"
                data-testid="input-layout-code"
                value={code}
                onChange={(event) => setCode(event.target.value)}
                spellCheck={false}
                aria-label="LayoutView component code"
              />
              <div className="code-footer">
                <span className={`parse-state ${isParsing ? '' : 'warn'}`}>{isParsing ? <Check /> : <CircleAlert />}{isParsing ? 'Valid object' : 'Preview fallback active'}</span>
                <span>{code.length} chars</span>
              </div>
            </article>

            <article className="panel preview-panel intro stagger-2">
              <div className="panel-head">
                <div className="panel-title"><Eye />Live preview</div>
                <span className="panel-kicker">Discord / message</span>
              </div>
              <div className="preview-body">
                <div className="discord-card">
                  <div className="discord-top">
                    <div className="discord-avatar">LV</div>
                    <div className="discord-author">LayoutView <span>today at 09:41</span></div>
                  </div>
                  <div className="discord-text">Components V2 / LayoutView</div>
                  <LayoutPreview code={code} />
                </div>
                <div className="preview-label">Rendered locally / updates as you type</div>
              </div>
            </article>
          </section>

          <section className="lower-grid intro stagger-3">
            <article className="panel destination-panel">
              <div className="panel-head">
                <div className="panel-title"><Send />Destination</div>
                <span className="panel-kicker">{botStatus?.connected ? 'Ready to route' : 'Bot required'}</span>
              </div>
              {!botStatus?.connected && (
                <div className="connect-note"><Link2 /><span>Connect a Discord bot to load your servers and channels.</span><button type="button" data-testid="button-connect-inline" onClick={() => setIsConnectOpen(true)}>Connect</button></div>
              )}
              <div className="form-grid">
                <label className="field">
                  <span className="field-label">Server <small>{guilds.length} available</small></span>
                  <select className="field-select" data-testid="select-server" value={selectedGuildId} onChange={(event) => { setSelectedGuildId(event.target.value); setSelectedChannelId(''); }} disabled={!botStatus?.connected || guildsQuery.isLoading}>
                    <option value="">{guildsQuery.isLoading ? 'Loading servers…' : 'Choose a server'}</option>
                    {guilds.map((guild: Guild) => <option key={guild.id} value={guild.id}>{guild.name}</option>)}
                  </select>
                </label>
                <label className="field">
                  <span className="field-label">Channel <small>{channels.length} text channels</small></span>
                  <select className="field-select" data-testid="select-channel" value={selectedChannelId} onChange={(event) => setSelectedChannelId(event.target.value)} disabled={!selectedGuildId || channelsQuery.isLoading}>
                    <option value="">{channelsQuery.isLoading ? 'Loading channels…' : 'Choose a channel'}</option>
                    {channels.map((channel) => <option key={channel.id} value={channel.id}># {channel.name}</option>)}
                  </select>
                </label>
              </div>
              <div className="destination-foot">
                <button className="action-btn primary" data-testid="button-send-now" type="button" onClick={sendPayload} disabled={!canSend || sendMessage.isPending}>{sendMessage.isPending ? <RefreshCw className="animate-spin" /> : <Zap />}{sendMessage.isPending ? 'Sending…' : 'Send now'}<ArrowUpRight /></button>
              </div>
            </article>

            <article className="panel schedule-panel">
              <div className="panel-head">
                <div className="panel-title"><CalendarClock />Schedule</div>
                <span className="panel-kicker">Optional</span>
              </div>
              <p className="schedule-copy">Queue this exact preview for a better moment. It will use the selected destination.</p>
              <div className="schedule-fields">
                <label className="field full">
                  <span className="field-label">Send at <small>Your local time</small></span>
                  <input className="field-input" data-testid="input-schedule-time" type="datetime-local" value={scheduleDate} onChange={(event) => setScheduleDate(event.target.value)} disabled={!canSend} />
                </label>
              </div>
              <div className="schedule-foot"><button className="action-btn secondary" data-testid="button-schedule" type="button" onClick={schedulePayload} disabled={!canSend || !scheduleDate || scheduleMessage.isPending}>{scheduleMessage.isPending ? 'Scheduling…' : 'Schedule message'}<CalendarClock /></button></div>
            </article>
          </section>

          <section className="panel activity-panel intro" id="activity">
            <div className="panel-head">
              <div className="panel-title"><Activity />Recent activity</div>
              <span className="panel-kicker">{activity.length ? `${activity.length} messages` : 'Nothing yet'}</span>
            </div>
            {schedulesQuery.isLoading && <div className="activity-list"><div className="skeleton-line" /><div className="skeleton-line" style={{ marginTop: 14, width: '78%' }} /></div>}
            {schedulesQuery.isError && <div className="error-note">Activity could not be loaded. <button type="button" data-testid="button-retry-activity" onClick={() => schedulesQuery.refetch()}>Try again</button></div>}
            {!schedulesQuery.isLoading && !activity.length && <div className="empty-state"><Inbox /><div>No sends in this workspace yet.</div></div>}
            {!schedulesQuery.isLoading && Boolean(activity.length) && (
              <div className="activity-list">
                {activity.map((item) => (
                  <div className="activity-row" key={item.id} data-testid={`row-activity-${item.id}`}>
                    <div className="activity-cell"><div className="activity-main">{item.previewTitle || 'Untitled LayoutView'}</div><div className="activity-sub">{item.guildName} / #{item.channelName}</div></div>
                    <div className="activity-cell"><div className="activity-sub">Destination</div><div className="activity-main">{item.channelName}</div></div>
                    <div className="activity-cell"><span className={`status-pill ${item.status}`}><i className="status-dot" />{item.status}</span></div>
                    <div className="activity-time">{formatDate(item.scheduledFor ?? item.createdAt)}</div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </main>
      </div>

      {notice && <div className="fixed bottom-5 right-5 z-50 flex items-center gap-3 rounded-lg border border-cyan-300/25 bg-[#131c2b] px-4 py-3 text-xs text-cyan-100 shadow-2xl" data-testid="status-notice"><Check className="h-4 w-4 text-cyan-300" />{notice}<button type="button" aria-label="Dismiss notification" data-testid="button-dismiss-notice" onClick={() => setNotice('')}><X className="h-3.5 w-3.5 text-slate-400" /></button></div>}

      {isConnectOpen && (
        <div className="fixed inset-0 z-40 flex items-center justify-center bg-[#050710]/75 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Connect Discord bot">
          <div className="w-full max-w-md rounded-xl border border-cyan-200/20 bg-[#111827] p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between"><div><div className="mb-2 flex items-center gap-2 text-sm font-bold text-slate-100"><Bot className="h-4 w-4 text-cyan-300" />Connect your bot</div><p className="text-xs leading-5 text-slate-400">Use a bot token with access to the servers you want to send into.</p></div><button className="text-slate-500 hover:text-slate-200" type="button" data-testid="button-close-connect" onClick={() => setIsConnectOpen(false)}><X className="h-4 w-4" /></button></div>
            <form onSubmit={handleConnect}>
              <label className="field"><span className="field-label">Bot token</span><input className="field-input" data-testid="input-bot-token" type="password" autoComplete="off" value={token} onChange={(event) => setToken(event.target.value)} placeholder="Paste token here" /></label>
              {connectBot.isError && <div className="error-note mx-0 mb-3 mt-3">Connection failed. Check the token and try again.</div>}
              <div className="mt-5 flex justify-end gap-2"><button className="ghost-btn" type="button" data-testid="button-cancel-connect" onClick={() => setIsConnectOpen(false)}>Cancel</button><button className="action-btn primary" type="submit" data-testid="button-submit-connect" disabled={token.trim().length < 20 || connectBot.isPending}>{connectBot.isPending ? 'Connecting…' : 'Connect bot'}<Link2 /></button></div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={Home} />
      <Route component={NotFound} />
    </Switch>
  );
}

function RoutedErrorBoundary({ children }: { children: ReactNode }) {
  const [location] = useLocation();
  return <ErrorBoundary resetKey={location}>{children}</ErrorBoundary>;
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
          <RoutedErrorBoundary><Router /></RoutedErrorBoundary>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;