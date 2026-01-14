<script lang="ts">
  import { T } from '../contexts/translation';
  import { Title, IconButton, IconCloseButton, Paragraph } from '../atoms';
  import { configuration } from '../contexts/configuration';
  import { Elements } from '../contexts/configuration/types';
  import { goToPrevStep, goToNextStep } from '../contexts/navigation';
  import { documents, selfieUri, currentStepId, selectedDocumentInfo, appState } from '../contexts/app-state/stores';
  import {
    EActionNames,
    sendButtonClickEvent,
    sendFlowCompleteEvent,
    EVerificationStatuses,
  } from '../utils/event-service';
  import { DecisionStatus } from '../contexts/app-state/types';
  import { getLayoutStyles, getStepConfiguration, uiPack } from '../ui-packs';
  import { getFlowConfig } from '../contexts/flows/hooks';
  import { submitVerification } from '../services/api/verification';

  export let stepId;

  const step = getStepConfiguration($configuration, $uiPack, stepId);
  const flow = getFlowConfig($configuration);
  const style = getLayoutStyles($configuration, $uiPack, step);

  const stepNamespace = step.namespace!;

  let isSubmitting = false;
  let submissionError = '';
  let fullScreenImage: string | null = null;
  let showExitConfirmation = false;

  // Collect all images for review
  let images: Array<{ label: string; src: string; type: string }> = [];

  $: {
    images = [];

    // Add document front
    if ($documents.front) {
      images.push({
        label: 'documentFront',
        src: $documents.front,
        type: 'document-front'
      });
    }

    // Add document back (if applicable)
    if ($documents.back && $selectedDocumentInfo?.backSide !== false) {
      images.push({
        label: 'documentBack',
        src: $documents.back,
        type: 'document-back'
      });
    }

    // Add selfie
    if ($selfieUri) {
      images.push({
        label: 'selfie',
        src: $selfieUri,
        type: 'selfie'
      });
    }
  }

  const handleSubmit = async () => {
    isSubmitting = true;
    submissionError = '';

    try {
      // Get session ID from window context
      const sessionId = (window as any).__blrn_context?.endUserInfo?.id || 'session_' + Date.now();

      // Submit verification to backend
      const result = await submitVerification({
        documentFront: $documents.front || '',
        documentBack: $documents.back,
        selfie: $selfieUri || '',
        documentType: $selectedDocumentInfo?.type || 'omang',
        sessionId,
      });

      // Emit flow complete event with verification details
      sendFlowCompleteEvent({
        status: EVerificationStatuses.COMPLETED,
        idvResult: DecisionStatus.PENDING,
        verificationId: result.verificationId,
        referenceNumber: result.referenceNumber,
      });

      // Navigate to next step (Loading -> Final)
      goToNextStep(currentStepId, $configuration, $currentStepId);
    } catch (error) {
      console.error('Submission failed:', error);

      // Determine error type and set appropriate translation key
      if (error instanceof Error) {
        if (error.message.includes('network') || error.message.includes('fetch')) {
          submissionError = 'networkError';
        } else if (error.message.includes('server') || error.message.includes('500')) {
          submissionError = 'serverError';
        } else {
          submissionError = 'submissionFailed';
        }
      } else {
        submissionError = 'submissionFailed';
      }
      isSubmitting = false;
    }
  };

  const handleEdit = (imageType: string) => {
    // Navigate back to specific capture step based on image type
    if (imageType === 'document-front') {
      currentStepId.set('check-document');
    } else if (imageType === 'document-back') {
      currentStepId.set('check-document-photo-back');
    } else if (imageType === 'selfie') {
      currentStepId.set('check-selfie');
    }
  };

  const handleImageClick = (src: string) => {
    fullScreenImage = src;
  };

  const closeFullScreen = () => {
    fullScreenImage = null;
  };

  const handleClose = () => {
    showExitConfirmation = true;
  };

  const confirmExit = () => {
    sendButtonClickEvent(
      EActionNames.CLOSE,
      { status: EVerificationStatuses.DATA_COLLECTION },
      $appState,
      true,
    );
    showExitConfirmation = false;
  };

  const cancelExit = () => {
    showExitConfirmation = false;
  };

  const handleBack = () => {
    goToPrevStep(currentStepId, $configuration, $currentStepId);
  };
</script>

<div class="container" {style}>
  {#each step.elements as element}
    {#if element.type === Elements.IconButton}
      <IconButton
        configuration={element.props}
        on:click={handleBack}
      />
    {/if}
    {#if element.type === Elements.IconCloseButton && flow.showCloseButton}
      <IconCloseButton
        configuration={element.props}
        on:click={handleClose}
      />
    {/if}
    {#if element.type === Elements.Title}
      <Title configuration={element.props}>
        <T key="title" namespace={stepNamespace} />
      </Title>
    {/if}
    {#if element.type === Elements.Paragraph}
      <Paragraph configuration={element.props}>
        <T key="description" namespace={stepNamespace} />
      </Paragraph>
    {/if}
  {/each}

  <div class="images-grid">
    {#each images as image}
      <div class="image-card">
        <div class="image-wrapper" on:click={() => handleImageClick(image.src)}>
          <img src={image.src} alt={image.label} />
        </div>
        <div class="image-footer">
          <div class="image-label">
            <T key={`labels.${image.label}`} namespace={stepNamespace} />
          </div>
          <button
            class="btn-edit"
            on:click={() => handleEdit(image.type)}
            aria-label={`Edit ${image.label}`}
          >
            <T key="buttons.edit" namespace={stepNamespace} />
          </button>
        </div>
      </div>
    {/each}
  </div>

  {#if submissionError}
    <div class="error-message" role="alert" aria-live="polite">
      <p><T key={`errors.${submissionError}`} namespace={stepNamespace} /></p>
      <button on:click={handleSubmit} disabled={isSubmitting} class="btn-retry">
        <T key="errors.retry" namespace={stepNamespace} />
      </button>
    </div>
  {/if}

  <button
    class="btn-submit"
    on:click={handleSubmit}
    disabled={isSubmitting || images.length === 0}
    aria-label="Submit verification"
  >
    {#if isSubmitting}
      <T key="loading.message" namespace={stepNamespace} />
    {:else}
      <T key="buttons.submit" namespace={stepNamespace} />
    {/if}
  </button>
</div>

{#if fullScreenImage}
  <div class="fullscreen-viewer" on:click={closeFullScreen}>
    <button class="close-button" on:click={closeFullScreen} aria-label="Close full screen">
      <T key="fullScreen.close" namespace={stepNamespace} />
    </button>
    <img src={fullScreenImage} alt="Full screen view" />
  </div>
{/if}

{#if showExitConfirmation}
  <div class="confirmation-dialog">
    <div class="dialog-content">
      <h3><T key="confirmation.title" namespace={stepNamespace} /></h3>
      <p><T key="confirmation.message" namespace={stepNamespace} /></p>
      <div class="dialog-buttons">
        <button on:click={cancelExit}>
          <T key="confirmation.cancel" namespace={stepNamespace} />
        </button>
        <button on:click={confirmExit} class="btn-danger">
          <T key="confirmation.confirm" namespace={stepNamespace} />
        </button>
      </div>
    </div>
  </div>
{/if}

<style>
  .container {
    padding: var(--padding);
    position: var(--position);
    background: var(--background);
    text-align: center;
    height: 100%;
    display: flex;
    flex-direction: column;
  }

  .images-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 16px;
    margin: 24px 0;
    flex-grow: 1;
    overflow-y: auto;
  }

  @media (max-width: 768px) {
    .images-grid {
      grid-template-columns: 1fr;
    }
  }

  .image-card {
    border: 2px solid #e5e7eb;
    border-radius: 8px;
    overflow: hidden;
    transition: all 0.2s;
    background: #fff;
    display: flex;
    flex-direction: column;
  }

  .image-card:hover {
    border-color: #75aadb;
    box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
  }

  .image-wrapper {
    cursor: pointer;
    flex-grow: 1;
  }

  .image-card img {
    width: 100%;
    height: 200px;
    object-fit: cover;
    display: block;
  }

  .image-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px;
    background: #f9fafb;
    border-top: 1px solid #e5e7eb;
  }

  .image-label {
    font-size: 14px;
    font-weight: 500;
    color: #374151;
    flex-grow: 1;
  }

  .btn-edit {
    padding: 6px 12px;
    border-radius: 6px;
    font-size: 13px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: 1px solid #75aadb;
    background: transparent;
    color: #75aadb;
    min-height: 32px;
  }

  .btn-edit:hover {
    background: rgba(117, 170, 219, 0.1);
  }

  .btn-submit {
    width: 100%;
    padding: 14px 24px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    min-height: 48px;
    background: #75aadb;
    color: #fff;
    margin-top: auto;
  }

  .btn-submit:hover:not(:disabled) {
    background: #5a8fc4;
  }

  .btn-submit:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }

  .error-message {
    background: #fee2e2;
    border: 1px solid #ef4444;
    border-radius: 8px;
    padding: 12px;
    margin: 16px 0;
    color: #991b1b;
  }

  .btn-retry {
    margin-top: 8px;
    padding: 8px 16px;
    border-radius: 6px;
    border: none;
    background: #ef4444;
    color: white;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
  }

  .btn-retry:hover:not(:disabled) {
    background: #dc2626;
  }

  .fullscreen-viewer {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.9);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    cursor: pointer;
  }

  .fullscreen-viewer img {
    max-width: 90%;
    max-height: 90%;
    object-fit: contain;
  }

  .close-button {
    position: absolute;
    top: 20px;
    right: 20px;
    background: rgba(255, 255, 255, 0.9);
    border: none;
    border-radius: 8px;
    padding: 12px 24px;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    z-index: 1001;
  }

  .close-button:hover {
    background: white;
  }

  .confirmation-dialog {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    z-index: 1000;
  }

  .dialog-content {
    background: white;
    border-radius: 12px;
    padding: 24px;
    max-width: 400px;
    width: 90%;
  }

  .dialog-content h3 {
    margin: 0 0 12px 0;
    font-size: 18px;
    font-weight: 600;
    color: #111827;
  }

  .dialog-content p {
    margin: 0 0 20px 0;
    font-size: 14px;
    color: #6b7280;
  }

  .dialog-buttons {
    display: flex;
    gap: 12px;
  }

  .dialog-buttons button {
    flex: 1;
    padding: 12px;
    border-radius: 8px;
    border: none;
    cursor: pointer;
    font-size: 14px;
    font-weight: 500;
    background: #f3f4f6;
    color: #374151;
  }

  .dialog-buttons button:hover {
    background: #e5e7eb;
  }

  .btn-danger {
    background: #ef4444 !important;
    color: white !important;
  }

  .btn-danger:hover {
    background: #dc2626 !important;
  }

  /* Dark theme support */
  @media (prefers-color-scheme: dark) {
    .image-card {
      background: #1f2937;
      border-color: #374151;
    }

    .image-footer {
      background: #111827;
      border-top-color: #374151;
    }

    .image-label {
      color: #f3f4f6;
    }

    .btn-edit {
      color: #93c5fd;
      border-color: #93c5fd;
    }

    .btn-edit:hover {
      background: rgba(147, 197, 253, 0.1);
    }

    .dialog-content {
      background: #1f2937;
      color: #f3f4f6;
    }

    .dialog-content h3 {
      color: #f9fafb;
    }

    .dialog-content p {
      color: #d1d5db;
    }

    .dialog-buttons button {
      background: #374151;
      color: #f3f4f6;
    }

    .dialog-buttons button:hover {
      background: #4b5563;
    }

    .error-message {
      background: #7f1d1d;
      border-color: #991b1b;
      color: #fecaca;
    }
  }

  /* Accessibility */
  @media (max-width: 576px) {
    .btn-submit {
      font-size: 14px;
      min-height: 44px;
    }

    .image-card img {
      height: auto;
      min-height: 150px;
    }
  }
</style>
