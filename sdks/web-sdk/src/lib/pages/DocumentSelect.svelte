<script lang="ts">
  import { createEventDispatcher } from 'svelte';
  import { DocumentOption } from '../atoms';
  import { selectedDocument, selectDocument, clearDocumentSelection } from '../contexts/app-state/stores';
  import { sendDocumentSelectedEvent } from '../utils/event-service/utils';
  import { T } from '../contexts/translation';
  import { t } from '../contexts/translation/hooks';

  export let stepId: string;

  const dispatch = createEventDispatcher();
  let selected = $selectedDocument;

  // Subscribe to store changes
  selectedDocument.subscribe(value => {
    selected = value;
  });

  const stepNamespace = 'document-selection';
  const optionsNamespace = 'document-select';

  function handleSelect(event: CustomEvent) {
    const { type } = event.detail;
    selectDocument(type);
  }

  function handleContinue() {
    if (selected) {
      sendDocumentSelectedEvent(selected);
      dispatch('navigate', {
        to: 'document-capture',
        documentType: selected,
      });
    }
  }

  function handleBack() {
    clearDocumentSelection();
    dispatch('navigate', {
      to: 'welcome',
    });
  }
</script>

<div class="document-select-container">
  <header class="header">
    <button
      class="back-button"
      on:click={handleBack}
      aria-label="Back"
    >
      ← <T key="back" namespace={stepNamespace} />
    </button>
    <span class="progress"><T key="step" namespace={stepNamespace} /></span>
  </header>

  <h1 class="title"><T key="title" namespace={stepNamespace} /></h1>
  <p class="description"><T key="description" namespace={stepNamespace} /></p>

  <div class="options-container" data-testid="options-container">
    <DocumentOption
      type="omang"
      icon="🪪"
      name={t(optionsNamespace, 'omang.name')}
      description={t(optionsNamespace, 'omang.description')}
      selected={selected === 'omang'}
      on:select={handleSelect}
    />

    <DocumentOption
      type="passport"
      icon="🛂"
      name={t(optionsNamespace, 'passport.name')}
      description={t(optionsNamespace, 'passport.description')}
      selected={selected === 'passport'}
      on:select={handleSelect}
    />

    <DocumentOption
      type="driversLicense"
      icon="🚗"
      name={t(optionsNamespace, 'driversLicense.name')}
      description={t(optionsNamespace, 'driversLicense.description')}
      selected={selected === 'driversLicense'}
      on:select={handleSelect}
    />
  </div>

  <button
    class="continue-button"
    class:disabled={!selected}
    disabled={!selected}
    data-testid="continue-button"
    on:click={handleContinue}
  >
    <T key="continue" namespace={stepNamespace} />
  </button>
</div>

<style>
  .document-select-container {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: 24px;
    background: var(--bg-color, #ffffff);
    font-family: Inter, sans-serif;
  }

  .header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 24px;
  }

  .back-button {
    background: transparent;
    border: none;
    font-size: 16px;
    color: var(--text-secondary, #6b7280);
    cursor: pointer;
    padding: 8px;
    display: flex;
    align-items: center;
    gap: 4px;
  }

  .back-button:hover {
    color: var(--text-primary, #1f2937);
  }

  .progress {
    font-size: 14px;
    color: var(--text-secondary, #6b7280);
  }

  .title {
    font-size: 24px;
    font-weight: 700;
    color: var(--text-primary, #1f2937);
    margin: 0 0 12px 0;
    text-align: center;
  }

  .description {
    font-size: 16px;
    color: var(--text-secondary, #6b7280);
    margin: 0 0 32px 0;
    text-align: center;
  }

  .options-container {
    display: flex;
    flex-direction: column;
    margin-bottom: 24px;
  }

  .continue-button {
    width: 100%;
    padding: 16px;
    background: #75aadb;
    color: #ffffff;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: all 0.2s ease;
    margin-top: auto;
  }

  .continue-button:hover:not(:disabled) {
    background: #5a8fc7;
    box-shadow: 0 4px 12px rgba(117, 170, 219, 0.3);
  }

  .continue-button:disabled {
    background: #d1d5db;
    cursor: not-allowed;
    opacity: 0.6;
  }

  /* Mobile responsive */
  @media (max-width: 576px) {
    .document-select-container {
      padding: 16px;
    }

    .title {
      font-size: 20px;
    }

    .description {
      font-size: 14px;
      margin-bottom: 24px;
    }

    .options-container {
      flex-direction: column;
    }
  }

  /* Dark theme support */
  @media (prefers-color-scheme: dark) {
    .document-select-container {
      --bg-color: #111827;
      --text-primary: #f9fafb;
      --text-secondary: #9ca3af;
    }

    .continue-button {
      background: #75aadb;
    }

    .continue-button:disabled {
      background: #374151;
    }
  }
</style>
