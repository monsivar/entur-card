import { css } from "lit";

export const styleEditor = css`
  .entity {
    display: flex;
    align-items: center;
  }

  ha-icon {
    display: flex;
  }

  .card-title,
  mwc-select {
    width: 100%;
  }

  .device-picker {
    margin: 1rem 0;
    padding: 0.75rem;
    border: 1px solid var(--divider-color);
    border-radius: 8px;
  }

  .device-picker p {
    margin-top: 0;
    color: var(--secondary-text-color);
  }

  .device-picker__header {
    display: flex;
    align-items: baseline;
    justify-content: space-between;
    gap: 1rem;
  }

  .device-picker__header p {
    margin-bottom: 0.5rem;
  }

  .device-search {
    box-sizing: border-box;
    display: block !important;
    width: 100% !important;
    height: 40px !important;
    padding: 0.65rem 0.75rem;
    border: 1px solid var(--divider-color, #666);
    border-radius: 4px;
    color: var(--primary-text-color, inherit);
    background: var(--card-background-color, transparent);
    font: inherit;
    margin-bottom: 0.5rem;
    opacity: 1;
    visibility: visible;
    cursor: text;
    line-height: 1.5;
  }

  .device-search:empty::before {
    content: attr(data-placeholder);
    color: var(--secondary-text-color);
    pointer-events: none;
  }

  .device-search:focus {
    outline: 2px solid var(--primary-color);
    outline-offset: -1px;
  }

  .device-option {
    display: flex;
    align-items: center;
    min-height: 40px;
  }

  .device-option .secondary {
    margin-left: 0.35rem;
  }

  .advanced {
    margin-top: 1rem;
    border-top: 1px solid var(--divider-color);
    padding-top: 0.75rem;
  }

  .advanced summary {
    cursor: pointer;
    color: var(--primary-text-color);
    font-weight: 500;
  }

  .advanced-content {
    padding-top: 0.75rem;
  }

  .empty-message {
    padding: 0.5rem 0;
    color: var(--secondary-text-color);
  }

  .entity .handle {
    padding-right: 8px;
    cursor: move;
  }

  .entity .handle > * {
    pointer-events: none;
  }

  .special-row {
    height: 60px;
    font-size: 16px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-grow: 1;
    overflow-x: hidden;
  }

  .special-row div {
    display: flex;
    flex-direction: column;
  }

  .remove-icon,
  .edit-icon {
    --mdc-icon-button-size: 36px;
    color: var(--secondary-text-color);
  }

  .secondary {
    font-size: 12px;
    color: var(--secondary-text-color);
  }
`;
