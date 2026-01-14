<script lang="ts">
  import { createEventDispatcher } from 'svelte';

  export let type: 'omang' | 'passport' | 'driversLicense';
  export let icon: string;
  export let name: string;
  export let description: string;
  export let selected: boolean = false;

  const dispatch = createEventDispatcher();

  function handleClick() {
    dispatch('select', { type });
  }
</script>

<button
  class="document-option"
  class:selected
  data-testid="document-option"
  data-document-type={type}
  on:click={handleClick}
  aria-label={`Select ${name}`}
>
  <div class="icon">{icon}</div>
  <div class="content">
    <div class="name">{name}</div>
    <div class="description">{description}</div>
  </div>
  {#if selected}
    <div class="checkmark" data-testid="checkmark">✓</div>
  {/if}
</button>

<style>
  .document-option {
    display: flex;
    align-items: center;
    width: 100%;
    min-height: 72px;
    padding: 16px;
    margin-bottom: 16px;
    background: #ffffff;
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    cursor: pointer;
    transition: all 0.2s ease;
    text-align: left;
    font-family: Inter, sans-serif;
  }

  .document-option:hover {
    border-color: #75aadb;
    box-shadow: 0 2px 8px rgba(117, 170, 219, 0.1);
  }

  .document-option.selected {
    background: #e9f5f9;
    border-color: #75aadb;
  }

  .icon {
    font-size: 32px;
    margin-right: 16px;
    min-width: 40px;
    text-align: center;
  }

  .content {
    flex: 1;
  }

  .name {
    font-size: 16px;
    font-weight: 600;
    color: #1f2937;
    margin-bottom: 4px;
  }

  .description {
    font-size: 14px;
    color: #6b7280;
  }

  .checkmark {
    font-size: 24px;
    color: #10b981;
    font-weight: bold;
    margin-left: 12px;
  }

  /* Mobile responsive - AC7: touch targets at least 44x44px */
  @media (max-width: 576px) {
    .document-option {
      min-height: 56px;
      min-width: 44px;
      padding: 12px;
    }

    .icon {
      font-size: 28px;
      min-width: 36px;
      margin-right: 12px;
    }

    .name {
      font-size: 15px;
    }

    .description {
      font-size: 13px;
    }
  }

  /* Touch target minimum for all touch devices */
  @media (pointer: coarse) {
    .document-option {
      min-height: 56px;
      min-width: 44px;
    }
  }

  /* Dark theme support */
  @media (prefers-color-scheme: dark) {
    .document-option {
      background: #1f2937;
      border-color: #374151;
      color: #f9fafb;
    }

    .document-option:hover {
      border-color: #75aadb;
    }

    .document-option.selected {
      background: #1e3a5f;
      border-color: #75aadb;
    }

    .name {
      color: #f9fafb;
    }

    .description {
      color: #9ca3af;
    }
  }
</style>
