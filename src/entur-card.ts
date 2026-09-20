import { LitElement, html, TemplateResult, CSSResultGroup } from "lit";
import { customElement, property, state } from "lit/decorators.js";
import { HomeAssistant, LovelaceCardEditor } from "custom-card-helpers";

import type {
  DeviceRegistryEntry,
  EntityRegistryEntry,
  EnturCardConfig,
  EnturCardEntityConfig,
} from "./types";
import { getEntityId, normalizeEntityConfig } from "./utils";
import pjson from "../package.json";
import "./templates/line";
import dayjs from "dayjs";
import "dayjs/locale/nb";
import { cardStyle } from "./styles/card";
import setupCustomlocalize from "./localize/localize";

/* eslint-disable @typescript-eslint/no-explicit-any */
(window as any).customCards = (window as any).customCards || [];
(window as any).customCards.push({
  type: "entur-card",
  name: "Entur Card",
  description:
    "A user-friendly departure card for the modern Entur Home Assistant integration.",
});
/* eslint-enable @typescript-eslint/no-explicit-any */

interface RenderableEntity {
  config: EnturCardEntityConfig;
  entityId: string;
  deviceId?: string;
  deviceName?: string;
}

@customElement("entur-card")
export class EnturCard extends LitElement {
  @property({ attribute: false }) public hass!: HomeAssistant;
  @property({ attribute: false }) public config!: EnturCardConfig;
  @state() private _entityRegistry: EntityRegistryEntry[] = [];
  @state() private _deviceRegistry: DeviceRegistryEntry[] = [];
  @state() private _now = Date.now();

  private _registryKey = "";
  private _clockTimer?: number;

  static async getConfigElement(): Promise<LovelaceCardEditor> {
    await import("./entur-card-editor");
    return document.createElement("entur-card-editor") as LovelaceCardEditor;
  }

  getCardSize(): number {
    return Math.max(1, (this.config?.entities?.length ?? 1) * 2);
  }

  public static getStubConfig(): object {
    return { entities: [], display_time: true, group_by_device: true };
  }

  setConfig(config: EnturCardConfig): void {
    this.config = {
      display_time: true,
      group_by_device: Boolean(config.devices?.length),
      show_empty: true,
      ...config,
    };
  }

  static get styles(): CSSResultGroup {
    return [cardStyle];
  }

  connectedCallback(): void {
    super.connectedCallback();
    this._clockTimer = window.setInterval(() => {
      this._now = Date.now();
    }, 30_000);
  }

  disconnectedCallback(): void {
    super.disconnectedCallback();
    if (this._clockTimer !== undefined) window.clearInterval(this._clockTimer);
  }

  protected updated(): void {
    const deviceIds = this.config?.devices?.join(",") ?? "";
    if (deviceIds && deviceIds !== this._registryKey) {
      this._registryKey = deviceIds;
      void this._loadRegistry();
    }
  }

  private async _loadRegistry(): Promise<void> {
    const callWS = (this.hass as unknown as {
      callWS?: (message: { type: string }) => Promise<unknown>;
    }).callWS;
    if (!callWS) return;

    try {
      const [entities, devices] = await Promise.all([
        callWS({ type: "config/entity_registry/list" }),
        callWS({ type: "config/device_registry/list" }),
      ]);
      this._entityRegistry = Array.isArray(entities) ? entities : [];
      this._deviceRegistry = Array.isArray(devices) ? devices : [];
    } catch {
      // Explicit entity configurations continue to work if registry access is unavailable.
    }
  }

  private _deviceName(deviceId?: string): string | undefined {
    const device = this._deviceRegistry.find((item) => item.id === deviceId);
    return device?.name_by_user ?? device?.name ?? undefined;
  }

  private _isWholeStopEntity(
    entry: EntityRegistryEntry,
    route: { attributes: Record<string, unknown> }
  ): boolean {
    const uniqueId = entry.unique_id?.toLowerCase() ?? "";
    if (uniqueId.includes(":stopplace:")) return true;
    if (uniqueId.includes(":quay:")) return false;

    const searchable = [
      entry.entity_id,
      entry.original_name ?? "",
      typeof route.attributes.friendly_name === "string"
        ? route.attributes.friendly_name
        : "",
    ]
      .join(" ")
      .toLowerCase();

    return /stop[ _-]?place|whole[ _-]?stop/.test(searchable);
  }

  private _renderableEntities(): RenderableEntity[] {
    const configured = (this.config?.entities ?? [])
      .map((item) => normalizeEntityConfig(item))
      .filter((item) => Boolean(item.entity));
    const selectedDevices = new Set(this.config?.devices ?? []);
    const discoveredEntries = this._entityRegistry
      .filter((item) => item.device_id && selectedDevices.has(item.device_id))
      .filter((item) => Boolean(this.hass.states[item.entity_id]));
    const devicesWithPlatforms = new Set(
      discoveredEntries
        .filter((item) => {
          const route = this.hass.states[item.entity_id];
          return route && !this._isWholeStopEntity(item, route);
        })
        .map((item) => item.device_id)
    );
    const discovered = discoveredEntries
      .filter((item) => {
        if (this.config?.show_stop_place) return true;
        const route = this.hass.states[item.entity_id];
        return (
          !route ||
          !item.device_id ||
          !this._isWholeStopEntity(item, route) ||
          !devicesWithPlatforms.has(item.device_id)
        );
      })
      .map((item) => ({ config: { entity: item.entity_id }, entityId: item.entity_id, deviceId: item.device_id ?? undefined }));

    const explicit = configured
      .map((item) => ({
        config: item,
        entityId: item.entity!,
        deviceId: this._entityRegistry.find((entry) => entry.entity_id === item.entity)?.device_id ?? undefined,
      }));
    const all = [...explicit, ...discovered];
    const seen = new Set<string>();
    return all
      .filter((item) => {
        if (seen.has(item.entityId)) return false;
        seen.add(item.entityId);
        return true;
      })
      .map((item) => ({ ...item, deviceName: this._deviceName(item.deviceId) }));
  }

  protected render(): TemplateResult {
    if (!this.config || !this.hass) return html``;

    const entities = this._renderableEntities();
    const grouped = new Map<string, RenderableEntity[]>();
    const ungrouped: RenderableEntity[] = [];

    entities.forEach((item) => {
      if (this.config.group_by_device && item.deviceId) {
        const group = grouped.get(item.deviceId) ?? [];
        group.push(item);
        grouped.set(item.deviceId, group);
      } else {
        ungrouped.push(item);
      }
    });

    return html`
      <ha-card>
        ${this._renderHeader()}
        <div class="entur-routes">
          ${[...grouped.entries()].map(([deviceId, group]) => html`
            <section class="entur-device-group">
              ${this.config.group_by_device
                ? html`<div class="entur-device-group__title">${this._deviceName(deviceId) ?? "Entur"}</div>`
                : html``}
              ${group.map((item) => this._renderEntity(item))}
            </section>
          `)}
          ${ungrouped.map((item) => this._renderEntity(item))}
          ${!entities.length && this.config.show_empty
            ? html`<div class="entur-empty">Ingen Entur-sensorer valgt</div>`
            : html``}
        </div>
      </ha-card>
    `;
  }

  private _renderEntity(item: RenderableEntity): TemplateResult {
    const route = this.hass.states[item.entityId];
    if (!route) return html``;

    const friendlyName =
      typeof route.attributes.friendly_name === "string"
        ? route.attributes.friendly_name
        : item.entityId;
    const localize = setupCustomlocalize(this.hass);
    let displayName = item.config.name ?? friendlyName;
    if (!item.config.name && item.deviceName) {
      const prefix = `${item.deviceName} `;
      if (friendlyName === item.deviceName) {
        displayName = localize("common.all_departures");
      } else if (friendlyName.startsWith(prefix)) {
        displayName = friendlyName.slice(prefix.length);
      }
    }

    return html`
      <div class="entur-route ${this.config.divide_routes ? "divided" : ""}">
        <ha-icon
          class="entur-route__icon"
          icon="${item.config.icon ? item.config.icon : route.attributes.icon ?? "mdi:bus"}"
        ></ha-icon>
        <h2 class="entur-route__name">
          ${displayName}
          ${item.config.destination
            ? html`<ha-icon class="entur-icon" icon="mdi:chevron-right"></ha-icon>${item.config.destination}`
            : html``}
        </h2>
        <div class="entur-route__lines">
          <entur-card-line
            .hass=${this.hass}
            .entity=${item.config}
            .route=${route}
          ></entur-card-line>
        </div>
      </div>
    `;
  }

  private _renderHeader(): TemplateResult {
    if (!this.config.name && !this.config.display_time) return html``;
    return html`
      <div class="card-header entur-header">
        ${this.config.name ? html`<div class="entur-header__name">${this.config.name}</div>` : html``}
        ${this.config.display_time
          ? html`<div class="entur-header__time">${dayjs(this._now).format("HH:mm")}</div>`
          : html``}
      </div>
    `;
  }
}

if (!customElements.get("entur-card")) {
  customElements.define("entur-card", EnturCard);
  console.info(
    `%c ENTUR-CARD \n%c ${pjson.version} `,
    "color: orange; font-weight: bold; background: black",
    "color: white; font-weight: bold; background: dimgray"
  );
}
