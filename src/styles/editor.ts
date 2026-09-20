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
