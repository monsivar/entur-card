import { LitElement, html, TemplateResult, CSSResultGroup } from "lit";
import { customElement, property, query, state } from "lit/decorators.js";
import { guard } from "lit/directives/guard.js";
import type { SortableEvent } from "sortablejs";
import { ScopedRegistryHost } from "@lit-labs/scoped-registry-mixin";

import {
  fireEvent,
  HomeAssistant,
  LovelaceCardEditor,
  HASSDomEvent,
} from "custom-card-helpers";
import buildElementDefinitions from "./buildElementDefinitions";
import globalElementLoader from "./globalElementLoader";

import MwcListItem from "./mwc/list-item";
import MwcSelect from "./mwc/select";
import type {
  DeviceRegistryEntry,
  EntityRegistryEntry,
  EditorTarget,
  EnturCardConfig,
  SubElementEditorConfig,
  EditSubElementEvent,
} from "./types";
import { styleEditor } from "./styles/editor";
import setupCustomlocalize from "./localize/localize";
import { normalizeEntityConfig } from "./utils";
import "./entur-card-entity-editor";

let Sortable;

@customElement("entur-card-editor")
export class EnturCardEditor
  extends ScopedRegistryHost(LitElement)
  implements LovelaceCardEditor
{
  @property({ attribute: false }) public hass?: HomeAssistant;
  @state() private _config!: EnturCardConfig;
  @state() private _attached = false;
  @state() private _renderEmptySortable = false;
  @state() private _subElementEditorConfig?: SubElementEditorConfig;
  @state() private _enturDevices: DeviceRegistryEntry[] = [];
  @state() private _enturEntityEntries: EntityRegistryEntry[] = [];
  @state() private _deviceSearch = "";

  private _entities?;
  private _sortable?;
  private _registryLoaded = false;

  static get elementDefinitions() {
    return buildElementDefinitions(
      [
        globalElementLoader("ha-checkbox"),
        globalElementLoader("ha-textfield"),
        globalElementLoader("ha-formfield"),
        globalElementLoader("ha-icon-button"),
        globalElementLoader("ha-icon"),
        globalElementLoader("entur-card-entity-editor"),
        MwcListItem,
        MwcSelect,
      ],
      EnturCardEditor
    );
  }

  static get styles(): CSSResultGroup {
    return [styleEditor];
  }

  public setConfig(config: EnturCardConfig): void {
    this._config = {
      name: "",
      entities: [],
      ...config,
    };
    this._entities = this._config.entities ?? [];
    this._registryLoaded = false;
    this._deviceSearch = "";
  }

  protected render(): TemplateResult {
    if (!this.hass || !this._entities) {
      return html``;
    }

    const customLocalize = setupCustomlocalize(this.hass);

    if (this._subElementEditorConfig) {
      return html`
        <entur-card-entity-editor
          .hass=${this.hass}
          .config=${this._subElementEditorConfig}
          @go-back=${this._goBack}
          @config-changed=${this._handleSubElementChanged}
          @edit-detail-element=${this._editDetailElement}
        >
        </entur-card-entity-editor>
      `;
    }

    // Filter states to only include Entur-like sensors.
    const sensorsWithRouteId = Object.values(this.hass!.states)
      .filter((entity) => entity.entity_id.startsWith("sensor."))
      .filter((sensor) =>
        Object.keys(sensor.attributes).some((key) =>
          key.toLowerCase().includes("route_id") ||
          key.toLowerCase() === "departures" ||
          key.toLowerCase() === "route"
        )
      )
      .map((sensor) => sensor.entity_id);

    const query = this._deviceSearch.trim().toLowerCase();
    const filteredDevices = this._enturDevices.filter((device) =>
      `${device.name_by_user ?? ""} ${device.name ?? ""} ${device.id}`
        .toLowerCase()
        .includes(query)
    );
    const selectedDeviceCount = this._config.devices?.length ?? 0;

    return html`
      <div class="card-config">
        <ha-textfield
          class="card-title"
          .label=${customLocalize("editor.name")}
          .value="${this._config.name}"
          .configValue="${"name"}"
          @change="${this._valueChanged}"
        ></ha-textfield>

        <ha-formfield .label=${customLocalize("editor.display_time")}>
          <ha-checkbox
            @change="${this._valueChanged}"
            .checked=${this._config.display_time}
            .configValue="${"display_time"}"
          ></ha-checkbox>
        </ha-formfield>

        <ha-formfield .label=${customLocalize("editor.divide_routes")}>
          <ha-checkbox
            @change="${this._valueChanged}"
            .checked=${this._config.divide_routes}
            .configValue="${"divide_routes"}"
          ></ha-checkbox>
        </ha-formfield>

        <ha-formfield .label=${customLocalize("editor.group_by_device")}>
          <ha-checkbox
            @change="${this._valueChanged}"
            .checked=${this._config.group_by_device}
            .configValue="${"group_by_device"}"
          ></ha-checkbox>
        </ha-formfield>

        ${this._enturDevices.length
          ? html`
              <div class="device-picker">
                <div class="device-picker__header">
                  <p>${customLocalize("editor.devices")}</p>
                  <span class="secondary">${selectedDeviceCount} valgt</span>
                </div>
                <div
                  contenteditable="true"
                  role="searchbox"
                  spellcheck="false"
                  class="device-search"
                  aria-label=${customLocalize("editor.search_devices")}
                  data-placeholder=${customLocalize("editor.search_devices")}
                  .textContent=${this._deviceSearch}
                  @input=${this._deviceSearchChanged}
                ></div>
                ${filteredDevices.length
                  ? filteredDevices.map(
                      (device) => html`
                        <div class="device-option">
                          <ha-formfield
                            .label=${device.name_by_user ?? device.name ?? device.id}
                          >
                            <ha-checkbox
                              .deviceId=${device.id}
                              .checked=${this._config.devices?.includes(device.id)}
                              @change=${this._deviceChanged}
                            ></ha-checkbox>
                          </ha-formfield>
                          <span class="secondary">(${this._deviceSensorCount(device.id)})</span>
                        </div>
                      `
                    )
                  : html`<div class="empty-message">${customLocalize("editor.no_devices")}</div>`}
                <ha-formfield .label=${customLocalize("editor.show_stop_place")}>
                  <ha-checkbox
                    @change=${this._valueChanged}
                    .checked=${this._config.show_stop_place ?? false}
                    .configValue=${"show_stop_place"}
                  ></ha-checkbox>
                </ha-formfield>
              </div>
            `
          : html``}

        <details class="advanced" ?open=${Boolean(this._entities?.length)}>
          <summary>${customLocalize("editor.advanced_entities")}</summary>
          <div class="advanced-content">
            <div class="secondary">${customLocalize("editor.advanced_entities_help")}</div>
            <div class="entities">
              ${guard([this._entities, this._renderEmptySortable], () =>
                this._renderEmptySortable
                  ? ""
                  : this._entities?.map(
                      (route, index) => html`
                        <div class="entity">
                          <div class="handle">
                            <ha-icon icon="mdi:drag"></ha-icon>
                          </div>
                          <div class="special-row">
                            <div>
                              <span
                                >${normalizeEntityConfig(route).name ?? normalizeEntityConfig(route).entity}</span
                              >
                              <span class="secondary">${normalizeEntityConfig(route).entity}</span>
                            </div>
                          </div>
                          <ha-icon-button
                            label="Remove"
                            class="remove-icon"
                            .index=${index}
                            @click=${this._removeRow}
                          >
                            <ha-icon icon="mdi:close"></ha-icon>
                          </ha-icon-button>
                          <ha-icon-button
                            label="Edit"
                            class="edit-icon"
                            .index=${index}
                            @click=${this._editRow}
                          >
                            <ha-icon icon="mdi:pencil"></ha-icon>
                          </ha-icon-button>
                        </div>
                      `
                    )
              )}
            </div>
            <mwc-select
              .label=${customLocalize("editor.entity")}
              @selected="${this._addEntity}"
              @closed="${(e) => e.stopPropagation()}"
              fixedMenuPosition
              naturalMenuWidth
            >
              ${sensorsWithRouteId.map(
                (entity) => html`
                  <mwc-list-item .value=${entity}> ${entity} </mwc-list-item>
                `
              )}
            </mwc-select>
          </div>
        </details>
      </div>
    `;
  }

  private _valueChanged(ev): void {
    if (!this._config || !this.hass) {
      return;
    }

    const target = ev.target;
    if (this[`_${target.configValue}`] === target.value) {
      return;
    }

    if (target.configValue) {
      if (target.value === "") {
        delete this._config[target.configValue];
      } else {
        this._config = {
          ...this._config,
          [target.configValue]:
            target.checked !== undefined ? target.checked : target.value,
        };
      }
    }
    fireEvent(this, "config-changed", { config: this._config });
  }

  private _handleSubElementChanged(ev: CustomEvent): void {
    ev.stopPropagation();
    if (!this._config || !this.hass) {
      return;
    }

    const value = ev.detail.config;
    const newConfigEntities = this._config!.entities!.concat();

    if (!value) {
      newConfigEntities.splice(this._subElementEditorConfig!.index!, 1);
      this._goBack();
    } else {
      newConfigEntities[this._subElementEditorConfig!.index!] = value;
    }
    this._config = { ...this._config!, entities: newConfigEntities };

    this._subElementEditorConfig = {
      ...this._subElementEditorConfig!,
      elementConfig: value,
    };

    fireEvent(this, "config-changed", { config: this._config });
  }

  public connectedCallback(): void {
    super.connectedCallback();
    this._attached = true;
  }

  public disconnectedCallback(): void {
    super.disconnectedCallback();
    this._attached = false;
  }

  protected updated(changedProps): void {
    super.updated(changedProps);
    const attachedChanged = changedProps.has("_attached");
    const entitiesChanged = changedProps.has("entities");

    if (attachedChanged && !this._attached) {
      // Tear down sortable, if available
      this._sortable?.destroy();
      this._sortable = undefined;
      return;
    }

    if (!this._sortable && this._entities) {
      this._createSortable();
    }

    if (entitiesChanged && this._entities) {
      this._handleEntitiesChanged();
    }

    if (!this._registryLoaded && this.hass) {
      this._registryLoaded = true;
      void this._loadEnturDevices();
    }
  }

  private async _loadEnturDevices(): Promise<void> {
    const callWS = (this.hass as unknown as {
      callWS?: (message: { type: string }) => Promise<unknown>;
    }).callWS;
    if (!callWS) return;

    try {
      const [entities, devices] = await Promise.all([
        callWS({ type: "config/entity_registry/list" }),
        callWS({ type: "config/device_registry/list" }),
      ]);
      const enturEntityEntries = (Array.isArray(entities) ? entities : []) as EntityRegistryEntry[];
      this._enturEntityEntries = enturEntityEntries;
      const deviceIds = new Set(
        enturEntityEntries
          .filter((entry) => entry.platform === "entur_public_transport" && entry.device_id)
          .map((entry) => entry.device_id as string)
      );
      this._enturDevices = (Array.isArray(devices) ? devices : [])
        .filter((device) => deviceIds.has(device.id)) as DeviceRegistryEntry[];
    } catch {
      this._enturDevices = [];
      this._enturEntityEntries = [];
    }
  }

  private _deviceSensorCount(deviceId: string): number {
    return this._enturEntityEntries.filter(
      (entry) =>
        entry.device_id === deviceId &&
        Boolean(this.hass?.states[entry.entity_id])
    ).length;
  }

  private _deviceSearchChanged(ev: Event): void {
    const target = ev.target as HTMLInputElement | HTMLElement;
    this._deviceSearch = "value" in target ? target.value ?? "" : target.textContent ?? "";
  }

  private _deviceChanged(ev: Event): void {
    const target = ev.currentTarget as HTMLElement & { checked?: boolean; deviceId?: string };
    if (!target.deviceId) return;
    const devices = new Set(this._config.devices ?? []);
    if (target.checked) devices.add(target.deviceId);
    else devices.delete(target.deviceId);
    this._config = { ...this._config, devices: [...devices] };
    fireEvent(this, "config-changed", { config: this._config });
  }

  private async _handleEntitiesChanged(): Promise<void> {
    this._renderEmptySortable = true;
    await this.updateComplete;
    const container = this.shadowRoot?.querySelector(
      ".entities"
    ) as HTMLElement;
    while (container.lastElementChild) {
      container.removeChild(container.lastElementChild);
    }
    this._renderEmptySortable = false;
  }

  private async _createSortable() {
    if (!Sortable) {
      const sortableImport = await import(
        "sortablejs/modular/sortable.core.esm"
      );

      Sortable = sortableImport.Sortable;
      Sortable.mount(sortableImport.OnSpill);
      Sortable.mount(sortableImport.AutoScroll());
    }

    const element = this.shadowRoot?.querySelector(".entities");
    if (!element) return;
    this._sortable = new Sortable(element, {
      animation: 150,
      fallbackClass: "sortable-fallback",
      handle: ".handle",
      onEnd: async (evt) => this._rowMoved(evt),
    });
  }

  private _rowMoved(ev: SortableEvent): void {
    if (ev.oldIndex === ev.newIndex) return;

    const newEntities = this._entities!.concat();
    newEntities.splice(ev.newIndex, 0, newEntities.splice(ev.oldIndex, 1)[0]);

    this._valueChanged({
      target: { configValue: "entities", value: newEntities },
    });
  }

  private _removeRow(ev): void {
    const index = ev.currentTarget?.index || 0;
    const newEntities = this._entities?.concat();
    newEntities?.splice(index, 1);

    this._valueChanged({
      target: { configValue: "entities", value: newEntities },
    });
  }

  private async _addEntity(ev): Promise<void> {
    const target = ev.target! as EditorTarget;
    const value = target.value as string;

    if (value === "") {
      return;
    }

    const newEntities = this._entities.concat({
      entity: value,
    });
    (ev.target as any).value = "";
    this._valueChanged({
      target: { configValue: "entities", value: newEntities },
    });
  }

  private _editRow(ev) {
    const index = ev.currentTarget.index;

    this._subElementEditorConfig = {
      index,
      elementConfig: this._entities[index],
    };
  }

  private _goBack(): void {
    this._subElementEditorConfig = undefined;
  }

  private _editDetailElement(ev: HASSDomEvent<EditSubElementEvent>): void {
    this._subElementEditorConfig = ev.detail.subElementConfig;
  }
}
