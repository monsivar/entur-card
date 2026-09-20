import { ActionConfig, LovelaceCardConfig } from "custom-card-helpers";

export interface EnturDeparture {
  route?: string;
  route_id?: string;
  destination?: string;
  expected_at?: string;
  due_at?: string;
  time?: string;
  minutes?: number;
  delay?: number;
  realtime?: boolean;
}

export interface EnturCardEntityConfig {
  entity?: string;
  name?: string;
  icon?: string;
  destination?: string;
  divide_lines?: boolean;
  clock_icon_state?: string;
  extra_departures?: string;
  human_readable_time?: string;
  remaining_time?: string;
}

export interface EnturCardConfig extends LovelaceCardConfig {
  entity?: string;
  entities?: Array<EnturCardEntityConfig | string>;
  devices?: string[];
  state?: object;
  divide_routes?: boolean;
  display_time?: boolean;
  group_by_device?: boolean;
  show_empty?: boolean;
  name?: string;
  show_warning?: boolean;
  show_error?: boolean;
}

export interface EntityRegistryEntry {
  entity_id: string;
  device_id?: string | null;
  platform?: string;
}

export interface DeviceRegistryEntry {
  id: string;
  name?: string | null;
  name_by_user?: string | null;
}

export interface SubElementEditorConfig {
  index?: number;
  elementConfig?: EnturCardEntityConfig;
  entity?: string;
}

export interface EditSubElementEvent {
  subElementConfig: SubElementEditorConfig;
}

export interface EditorTarget extends EventTarget {
  value?: string;
  index?: number;
  checked?: boolean;
  configValue?: string;
  type?: HTMLInputElement["type"];
  config: ActionConfig;
}
