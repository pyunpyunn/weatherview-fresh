import { createFileRoute } from "@tanstack/react-router";
import {
  AlertTriangle,
  CloudLightning,
  CloudRain,
  CloudSun,
  Cloudy,
  ExternalLink,
  RefreshCcw,
  Sun,
} from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Weather Updates | Municipal Operations" },
      { name: "description", content: "Current weather conditions, forecasts, advisories, and monitoring history." },
      { property: "og:title", content: "Weather Updates | Municipal Operations" },
      { property: "og:description", content: "Current weather conditions, forecasts, advisories, and monitoring history." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: WeatherPage,
});

type ForecastDay = {
  date: string;
  condition_name: string;
  temp_min: number;
  temp_max: number;
  rain_probability: number;
  rainfall_sum: number;
  gust_max: number;
};

type Snapshot = {
  condition_key?: string;
  condition_name?: string;
  temperature?: number;
  apparent_temperature?: number;
  humidity?: number;
  rainfall_mm?: number;
  wind_speed?: number;
  wind_direction?: string;
  wind_gusts?: number;
  risk_level?: string;
  advisory_text?: string;
  source_name?: string;
  observed_at?: string;
  created_at?: string;
  daily_forecast?: ForecastDay[];
};

type WeatherLog = Snapshot & { weather_log_id: string; observed_time?: string };
type SourceLink = { name: string; url: string; note?: string };
type Workspace = {
  latest_snapshot?: Snapshot | null;
  logs?: WeatherLog[];
  source_links?: SourceLink[];
  location?: { name?: string };
  active_event?: { name?: string; type_name?: string; severity_label?: string } | null;
};

const demoWorkspace: Workspace = {
  location: { name: "Barangay Sta. Cruz" },
  latest_snapshot: {
    condition_key: "cloudy",
    condition_name: "Partly Cloudy",
    temperature: 28,
    apparent_temperature: 31,
    humidity: 76,
    rainfall_mm: 2.4,
    wind_speed: 22,
    wind_direction: "NW",
    wind_gusts: 31,
    risk_level: "warning",
    advisory_text: "Moderate rainfall may affect low-lying areas. Continue monitoring drainage and river levels.",
    source_name: "Open-Meteo Forecast API",
    observed_at: "14:32",
    daily_forecast: [
      { date: "Today", condition_name: "Rain", temp_min: 25, temp_max: 31, rain_probability: 70, rainfall_sum: 8.2, gust_max: 32 },
      { date: "Tomorrow", condition_name: "Cloudy", temp_min: 24, temp_max: 30, rain_probability: 45, rainfall_sum: 3.1, gust_max: 25 },
      { date: "Friday", condition_name: "Clear", temp_min: 24, temp_max: 32, rain_probability: 20, rainfall_sum: 0.4, gust_max: 19 },
    ],
  },
  logs: [
    { weather_log_id: "1", observed_time: "14:32", condition_name: "Partly Cloudy", risk_level: "warning", rainfall_mm: 2.4 },
    { weather_log_id: "2", observed_time: "11:30", condition_name: "Light Rain", risk_level: "normal", rainfall_mm: 1.1 },
    { weather_log_id: "3", observed_time: "08:31", condition_name: "Cloudy", risk_level: "normal", rainfall_mm: 0 },
  ],
  source_links: [{ name: "PAGASA", url: "https://www.pagasa.dost.gov.ph/", note: "Official weather bulletins" }],
  active_event: { name: "Southwest Monsoon Monitoring", type_name: "Weather", severity_label: "Moderate" },
};

function WeatherPage() {
  const [workspace, setWorkspace] = useState<Workspace>(demoWorkspace);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [refreshMessage, setRefreshMessage] = useState("");

  async function requestWeather(method: "GET" | "POST") {
    const response = await fetch("/api/weather", { method });
    if (!response.ok) throw new Error("Weather service unavailable");
    const payload = await response.json();
    return (payload.data ?? payload) as Workspace;
  }

  useEffect(() => {
    let ignore = false;
    requestWeather("GET")
      .then((data) => { if (!ignore) setWorkspace(data); })
      .catch(() => { /* Keep the latest visible snapshot when the service is unavailable. */ })
      .finally(() => { if (!ignore) setIsLoading(false); });
    return () => { ignore = true; };
  }, []);

  async function handleRefresh() {
    setIsRefreshing(true);
    setError("");
    setRefreshMessage("");
    try {
      setWorkspace(await requestWeather("POST"));
      setRefreshMessage("Weather snapshot saved.");
    } catch {
      setError("Unable to refresh weather data. The latest available snapshot is still shown.");
    } finally {
      setIsRefreshing(false);
    }
  }

  const latest = workspace.latest_snapshot;
  const logs = workspace.logs ?? [];
  const forecast = latest?.daily_forecast?.slice(0, 3) ?? [];
  const risk = latest?.risk_level ?? "normal";

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-[1200px] px-4 py-5 sm:px-5">
        <header className="flex flex-col gap-4 pb-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-[17px] font-semibold leading-tight">Weather Updates</h1>
            <p className="mt-1 font-medium text-muted-foreground">{workspace.location?.name ?? "Local monitoring area"}</p>
          </div>
          <div className="flex items-center justify-between gap-4 sm:justify-end">
            <div className="text-right">
              <div className="font-semibold">{isLoading ? "Connecting" : "Live"}</div>
              <div className="font-medium text-muted-foreground">Updated {formatTime(latest?.observed_at ?? latest?.created_at)}</div>
            </div>
            <Button type="button" disabled={isRefreshing} onClick={handleRefresh}>
              <RefreshCcw className={isRefreshing ? "size-4 animate-spin" : "size-4"} aria-hidden="true" />
              {isRefreshing ? "Refreshing" : "Refresh"}
            </Button>
          </div>
        </header>

        {(error || refreshMessage) && (
          <div className={`mb-4 rounded-md border px-3 py-2 font-medium ${error ? "border-destructive/25 bg-danger-soft text-danger-text" : "border-success/25 bg-success/10 text-foreground"}`} role="status">
            {error || refreshMessage}
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <aside className="grid gap-4 sm:grid-cols-2 lg:col-span-3 lg:flex lg:flex-col">
            <Panel className="sm:col-span-2 lg:col-span-1">
              <Label>Current condition</Label>
              <div className="mt-2 flex items-center gap-2">
                <div className="grid size-9 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
                  <ConditionIcon condition={latest?.condition_key} />
                </div>
                <div className="text-[15px] font-semibold">{latest?.condition_name ?? "No snapshot"}</div>
              </div>
            </Panel>
            <Metric label="Temperature" value={formatValue(latest?.temperature, "°C")} detail={latest?.apparent_temperature == null ? "Feels-like unavailable" : `Feels like ${latest.apparent_temperature}°C · ${latest.humidity ?? "–"}% humidity`} large />
            <Metric label="Rainfall" value={formatValue(latest?.rainfall_mm, " mm")} detail="Current precipitation" />
            <Metric label="Wind" value={formatValue(latest?.wind_speed, " km/h")} detail={`Gusting ${latest?.wind_gusts ?? "–"} · ${latest?.wind_direction ?? "–"}`} />
          </aside>

          <section className="flex flex-col gap-4 lg:col-span-6">
            <Panel>
              <div className="flex items-center justify-between gap-3"><Label>Three-day forecast</Label><span className="font-medium text-muted-foreground">{workspace.location?.name}</span></div>
              {forecast.length ? (
                <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                  {forecast.map((day) => (
                    <article className="rounded-md bg-muted p-3" key={day.date}>
                      <div className="font-medium text-muted-foreground">{day.date}</div>
                      <div className="mt-1 text-[16px] font-semibold">{day.temp_max}° / {day.temp_min}°</div>
                      <div className="mt-1 font-medium text-muted-foreground">{day.condition_name} · {day.rain_probability}% rain</div>
                    </article>
                  ))}
                </div>
              ) : <EmptyCopy>No forecast snapshot available.</EmptyCopy>}
            </Panel>

            <Panel>
              <div className="flex items-center justify-between gap-3">
                <Label>Risk advisory</Label>
                <Status tone={risk}>{risk === "normal" ? "Monitoring" : risk}</Status>
              </div>
              <div className="mt-2 text-[14px] font-semibold">{workspace.active_event?.name ?? "No active weather event"}</div>
              <p className="mt-1 font-medium leading-relaxed text-muted-foreground">{latest?.advisory_text ?? "No advisory has been saved for the current monitoring period."}</p>
              {workspace.active_event && (
                <div className="mt-3 flex items-center gap-2 text-[11px] font-medium text-muted-foreground">
                  <span className="size-1.5 rounded-full bg-accent" />
                  {workspace.active_event.type_name} · {workspace.active_event.severity_label}
                </div>
              )}
            </Panel>

            {workspace.source_links?.length ? (
              <Panel>
                <Label>Official sources</Label>
                <div className="mt-2 flex flex-wrap gap-2">
                  {workspace.source_links.map((source) => (
                    <a className="inline-flex items-center gap-1.5 rounded-md border border-border px-2.5 py-2 font-semibold text-primary hover:bg-muted" href={source.url} target="_blank" rel="noreferrer" key={source.url}>
                      {source.name}<ExternalLink className="size-3.5" aria-hidden="true" />
                    </a>
                  ))}
                </div>
              </Panel>
            ) : null}
          </section>

          <aside className="flex flex-col gap-4 lg:col-span-3">
            <Panel>
              <Label>Source freshness</Label>
              <div className="mt-2 flex items-center gap-2"><span className="size-2 rounded-full bg-success" /><strong>{latest?.source_name ?? "No source"}</strong></div>
              <div className="mt-1 font-medium text-muted-foreground">Latest snapshot · {formatTime(latest?.observed_at ?? latest?.created_at)}</div>
            </Panel>
            <Panel className="flex-1">
              <div className="flex items-center justify-between"><Label>Alert history</Label><span className="text-[11px] font-medium text-muted-foreground">{logs.length}</span></div>
              {logs.length ? (
                <div className="mt-3">
                  {logs.slice(0, 6).map((log) => (
                    <div className="flex gap-2 border-b border-border py-2 last:border-0" key={log.weather_log_id}>
                      <span className={`mt-1.5 size-1.5 shrink-0 rounded-full ${log.risk_level === "critical" ? "bg-destructive" : log.risk_level === "warning" ? "bg-accent" : "bg-primary"}`} />
                      <div><div className="font-semibold">{log.condition_name ?? "Weather update"}</div><div className="font-medium text-muted-foreground">{log.observed_time ?? formatTime(log.observed_at)} · Rain {formatValue(log.rainfall_mm, " mm")}</div></div>
                    </div>
                  ))}
                </div>
              ) : <EmptyCopy>No saved weather history.</EmptyCopy>}
            </Panel>
          </aside>
        </div>
      </div>
    </main>
  );
}

function Panel({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-lg border border-border bg-card p-4 shadow-[0_1px_2px_color-mix(in_oklab,var(--foreground)_5%,transparent)] ${className}`}>{children}</section>;
}

function Label({ children }: { children: React.ReactNode }) {
  return <div className="text-[11px] font-medium uppercase tracking-[0.04em] text-muted-foreground">{children}</div>;
}

function Metric({ label, value, detail, large = false }: { label: string; value: string; detail: string; large?: boolean }) {
  return <Panel><Label>{label}</Label><div className={`mt-1 font-semibold leading-none ${large ? "text-[26px]" : "text-[20px]"}`}>{value}</div><div className="mt-1 font-medium text-muted-foreground">{detail}</div></Panel>;
}

function Status({ children, tone }: { children: React.ReactNode; tone: string }) {
  const style = tone === "critical" ? "bg-destructive/10 text-destructive" : tone === "warning" ? "bg-accent/10 text-accent" : "bg-primary/10 text-primary";
  return <span className={`rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize ${style}`}>{children}</span>;
}

function EmptyCopy({ children }: { children: React.ReactNode }) {
  return <p className="mt-3 rounded-md bg-muted p-3 font-medium text-muted-foreground">{children}</p>;
}

function ConditionIcon({ condition }: { condition: string | undefined }) {
  const className = "size-5";
  if (condition === "sunny") return <Sun className={className} aria-hidden="true" />;
  if (condition === "rainy") return <CloudRain className={className} aria-hidden="true" />;
  if (condition === "storm" || condition === "stormy") return <CloudLightning className={className} aria-hidden="true" />;
  if (condition === "cloudy") return <Cloudy className={className} aria-hidden="true" />;
  return <CloudSun className={className} aria-hidden="true" />;
}

function formatValue(value: number | undefined, unit: string) {
  if (value == null) return `–${unit.trimStart()}`;
  return `${Number(value).toFixed(Number(value) % 1 === 0 ? 0 : 1)}${unit}`;
}

function formatTime(value?: string) {
  return value || "Not yet available";
}