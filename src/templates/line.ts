import { LitElement, html, TemplateResult, CSSResultGroup } from "lit";
import { customElement, property } from "lit/decorators.js";

import "./human-readable";
import { cardStyle } from "../styles/card";
import setupCustomlocalize from "../localize/localize";
import type { EnturCardEntityConfig } from "../types";
import {
  departureClockTime,
  departureMinutes,
  getDepartures,
  ResolvedDeparture,
} from "../utils";

@customElement("entur-card-line")
export class EnturCardLine extends LitElement {
  @property() hass;
  @property() entity!: EnturCardEntityConfig;
  @property() route;

  static get styles(): CSSResultGroup {
    return [cardStyle];
  }

  protected render(): TemplateResult {
    if (!this.entity || !this.route) return html``;

    const departures = getDepartures(this.route);
    if (!departures.length) {
      return html`<div class="entur-empty">${setupCustomlocalize(this.hass)("common.unknown")}</div>`;
    }

    const visible = this.entity.extra_departures === "all"
      ? departures
      : departures.slice(0, this.entity.extra_departures === "next" ? 2 : 1);

    return html`
      ${visible.map((departure, index) => this._renderDeparture(
        departure,
        index,
      ))}
    `;
  }

  private _renderDeparture(
    departure: ResolvedDeparture,
    index: number,
  ): TemplateResult {
    const type = index === 0 ? "line" : index === 1 ? "line_next" : "line_extras";
    const humanReadable = this.entity.human_readable_time === "all"
      || this.entity.human_readable_time === type;
    const showRemaining = this.entity.remaining_time === "all"
      || this.entity.remaining_time === type;
    const minutes = departureMinutes(departure);
    const clockTime = departureClockTime(departure);
    const lineClass = index === 0 ? "entur-line" : `entur-line ${this.entity.divide_lines ? "divided" : ""}`;
    const routeLabel = departure.destination
      ? html`${departure.route}<span class="entur-destination">${departure.destination}</span>`
      : html`${departure.route}`;
    const customLocalize = setupCustomlocalize(this.hass);

    return html`
      <div class="${lineClass}">
        <div class="entur-line__header">
          ${routeLabel}
          ${!departure.realtime && departure.realtime !== undefined
            ? html`<span class="entur-scheduled">ca.</span>`
            : html``}
          ${humanReadable
            ? html`<entur-card-human-readable
                .hass=${this.hass}
                .departure=${departure}
              ></entur-card-human-readable>`
            : html``}
        </div>
        ${departure.delay && departure.delay > 0
          ? html`<div class="entur-line__delay entur-column">
              <ha-icon class="entur-icon" icon="mdi:clock-alert-outline"></ha-icon>
              ${departure.delay} min
            </div>`
          : html``}
        <div class="entur-line__due entur-column icon-${this.entity.clock_icon_state ?? "hidden"}">
          <ha-icon class="entur-line__icon" icon="mdi:clock"></ha-icon>
          ${showRemaining
            ? this._renderRemaining(minutes, customLocalize)
            : clockTime ?? this._renderRemaining(minutes, customLocalize)}
        </div>
      </div>
    `;
  }

  private _renderRemaining(
    minutes: number | undefined,
    localize: (key: string) => string,
  ): TemplateResult {
    if (minutes === undefined) return html`—`;
    if (minutes <= 0) return html`${localize("common.departing")}`;
    const label = localize(minutes === 1 ? "common.minute" : "common.minutes");
    return html`${minutes} ${label}`;
  }
}
