<script lang="ts">
  import { T } from '../contexts/translation';
  import { Title, IconButton, Photo, Paragraph, IconCloseButton } from '../atoms';
  import { configuration } from '../contexts/configuration';
  import { Elements } from '../contexts/configuration/types';
  import { goToPrevStep, goToNextStep } from '../contexts/navigation';
  import { DocumentType, getDocImage, appState } from '../contexts/app-state';
  import { NavigationButtons } from '../molecules';
  import { documents, currentStepId, selectedDocumentInfo, pendingCaptureMetadata, clearPendingCaptureMetadata } from '../contexts/app-state/stores';
  import { preloadNextStepByCurrent } from '../services/preload-service';
  import {
    EActionNames,
    sendButtonClickEvent,
    sendDocumentCapturedEvent,
    EVerificationStatuses,
  } from '../utils/event-service';
  import { getLayoutStyles, getStepConfiguration, uiPack } from '../ui-packs';
  import { getFlowConfig } from '../contexts/flows/hooks';
  import { get } from 'svelte/store';

  export let stepId;

  const step = getStepConfiguration($configuration, $uiPack, stepId);
  const flow = getFlowConfig($configuration);
  const style = getLayoutStyles($configuration, $uiPack, step);

  const stepNamespace = step.namespace!;
  const documentType =
    (($configuration.steps && $configuration.steps[$currentStepId].type) as DocumentType || $uiPack.steps[$currentStepId].type as DocumentType) || $selectedDocumentInfo.type;


  let image = '';
  let skipBackSide = false;

  $: {
    if (!documentType) {
      goToPrevStep(currentStepId, $configuration, $currentStepId);
    }
    if (documentType) {
      image = getDocImage(documentType, $documents);
    }
    if ($selectedDocumentInfo && !$selectedDocumentInfo.backSide) {
      skipBackSide = true;
    }
    preloadNextStepByCurrent(
      $configuration,
      configuration,
      $currentStepId,
      $uiPack,
      skipBackSide ? 'back-side' : undefined,
    );
  }

  // Handle Continue button click - emit document.captured event per AC5
  const handleContinue = () => {
    const metadata = get(pendingCaptureMetadata);

    if (metadata) {
      // Emit document.captured event when user confirms the capture
      sendDocumentCapturedEvent(
        metadata.documentType,
        metadata.side,
        metadata.imageSize,
        metadata.compressionRatio,
        metadata.captureTime,
        metadata.cameraResolution,
      );

      // Clear the pending metadata
      clearPendingCaptureMetadata();
    }

    // Navigate to next step
    const skipType = skipBackSide ? 'back-side' : undefined;
    goToNextStep(currentStepId, $configuration, $currentStepId, skipType);
  };
</script>

<div class="container" {style}>
  {#each step.elements as element}
    {#if element.type === Elements.IconButton}
      <IconButton
        configuration={element.props}
        on:click={() => goToPrevStep(currentStepId, $configuration, $currentStepId)}
      />
    {/if}
    {#if element.type === Elements.IconCloseButton && flow.showCloseButton}
      <IconCloseButton
        configuration={element.props}
        on:click={() => {
          sendButtonClickEvent(
            EActionNames.CLOSE,
            { status: EVerificationStatuses.DATA_COLLECTION },
            $appState,
            true,
          );
        }}
      />
    {/if}
    {#if element.type === Elements.Title}
      <Title configuration={element.props}>
        <T key={'title'} namespace={stepNamespace} />
      </Title>
    {/if}
    {#if element.type === Elements.Paragraph}
      <Paragraph configuration={element.props}>
        <T key={'description'} namespace={stepNamespace} />
      </Paragraph>
    {/if}
    {#if element.type === Elements.Photo}
      <Photo configuration={element.props} src={image} />
    {/if}
  {/each}
  <div class="navigation-buttons">
    <button class="btn-retake" on:click={() => goToPrevStep(currentStepId, $configuration, $currentStepId)}>
      <T key={'retake'} namespace={stepNamespace} />
    </button>
    <button class="btn-continue" on:click={handleContinue}>
      <T key={'continue'} namespace={stepNamespace} />
    </button>
  </div>
</div>

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

  .navigation-buttons {
    display: flex;
    gap: 12px;
    padding: 16px;
    margin-top: auto;
  }

  .btn-retake,
  .btn-continue {
    flex: 1;
    padding: 14px 24px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    min-height: 48px;
  }

  .btn-retake {
    background: transparent;
    color: #75aadb;
    border: 2px solid #75aadb;
  }

  .btn-retake:hover {
    background: rgba(117, 170, 219, 0.1);
  }

  .btn-continue {
    background: #75aadb;
    color: #fff;
  }

  .btn-continue:hover {
    background: #5a8fc4;
  }

  @media (max-width: 576px) {
    .navigation-buttons {
      flex-direction: column;
    }

    .btn-retake,
    .btn-continue {
      font-size: 14px;
      min-height: 44px;
    }
  }

  /* Dark theme support */
  @media (prefers-color-scheme: dark) {
    .btn-retake {
      color: #93c5fd;
      border-color: #93c5fd;
    }

    .btn-retake:hover {
      background: rgba(147, 197, 253, 0.1);
    }
  }
</style>
