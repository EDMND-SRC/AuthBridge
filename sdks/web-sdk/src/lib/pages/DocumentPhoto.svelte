<script lang="ts">
  import CameraPhoto, { FACING_MODES } from 'jslib-html5-camera-photo';
  import { T } from '../contexts/translation';
  import { configuration } from '../contexts/configuration';
  import { onDestroy, onMount } from 'svelte';
  import {
    CameraButton,
    IconButton,
    IconCloseButton,
    Overlay,
    Paragraph,
    VideoContainer,
    Loader,
    QualityFeedback,
  } from '../atoms';
  import { Elements } from '../contexts/configuration/types';
  import { DocumentType, IDocument, appState } from '../contexts/app-state';
  import { goToNextStep, goToPrevStep } from '../contexts/navigation';
  import Title from '../atoms/Title/Title.svelte';
  import { documents, currentStepId, selectedDocumentInfo } from '../contexts/app-state/stores';
  import merge from 'deepmerge';
  import { preloadNextStepByCurrent } from '../services/preload-service';
  import {
    EActionNames,
    EVerificationStatuses,
    sendButtonClickEvent,
  } from '../utils/event-service';
  import { getLayoutStyles, getStepConfiguration, uiPack } from '../ui-packs';
  import { createToggle } from '../hooks/createToggle/createToggle';
  import { compressImage } from '../services/image-compression';
  import { analyzeImageQuality, type QualityFeedback as QualityFeedbackType } from '../utils/photo-utils';
  import { setPendingCaptureMetadata } from '../contexts/app-state/stores';

  export let stepId;

  let video: HTMLVideoElement;
  let container: HTMLDivElement;
  let cameraPhoto: CameraPhoto | undefined = undefined;
  let qualityFeedback: QualityFeedbackType = {
    lighting: 'good',
    blur: 'good',
    glare: 'good',
  };
  let qualityCheckInterval: number | undefined;
  let cameraError: string | null = null;
  let isCompressing = false;

  const step = getStepConfiguration($configuration, $uiPack, stepId);
  const style = getLayoutStyles($configuration, $uiPack, step);

  const [isDisabled, , toggleOnIsDisabled, toggleOffIsDisabled] = createToggle();

  const documentOptionsConfiguration = merge(
    $uiPack.documentOptions,
    $configuration.documentOptions || {},
  );

  const documentType =
    (($configuration.steps && $configuration.steps[$currentStepId].type) as DocumentType) ||
    ($uiPack.steps[$currentStepId].type as DocumentType) ||
    $selectedDocumentInfo.type;

  let stream: MediaStream;
  const stepNamespace = `${step.namespace}.${documentType}`;

  $: {
    if (!documentType) goToPrevStep(currentStepId, $configuration, $currentStepId);
  }

  onMount(() => {
    if (!video) return;
    cameraPhoto = new CameraPhoto(video);
    cameraPhoto
      .startCamera(FACING_MODES.ENVIRONMENT, {
        width: 1920,
        height: 1080,
      })
      .then(cameraStream => {
        console.log('stream', cameraStream);
        stream = cameraStream;
        cameraError = null;

        // Start quality feedback analysis
        qualityCheckInterval = window.setInterval(() => {
          if (video && video.readyState === video.HAVE_ENOUGH_DATA) {
            qualityFeedback = analyzeImageQuality(video);
          }
        }, 500); // Update every 500ms
      })
      .catch(error => {
        console.log('error', error);
        cameraError = error.message || 'Camera access denied';
      });
  });

  onDestroy(() => {
    if (qualityCheckInterval) {
      clearInterval(qualityCheckInterval);
    }
    cameraPhoto?.stopCamera();
  });

  const clearDocs = (type: DocumentType): IDocument[] => {
    const { options } = documentOptionsConfiguration;
    const isFromOptions = Object.keys(options).find(key => key === type);
    if (isFromOptions) {
      return $documents.filter(d => !Object.keys(options).find(key => key === d.type));
    }
    return $documents.filter(d => type !== d.type);
  };

  const addDocument = (type: DocumentType, base64: string, document: IDocument): IDocument[] => {
    const clearedDocuments = clearDocs(type);
    return [
      ...clearedDocuments,
      {
        ...document,
        pages: [{ side: 'front', base64 }],
      },
    ];
  };

  const handleTakePhoto = async () => {
    if (!cameraPhoto || $isDisabled) return;

    toggleOnIsDisabled();
    isCompressing = true;
    const captureStartTime = Date.now();

    try {
      const base64 = cameraPhoto.getDataUri(
        $configuration.settings?.cameraSettings || $uiPack.settings.cameraSettings,
      );

      // Convert base64 to blob for compression
      const response = await fetch(base64);
      const blob = await response.blob();

      // Compress image
      const compressed = await compressImage(blob, {
        quality: 0.85,
        maxWidth: 1920,
        maxHeight: 1080,
      });

      const captureTime = Date.now() - captureStartTime;
      const cameraResolution = `${video.videoWidth}x${video.videoHeight}`;

      if (documentType) {
        const document = { type: documentType, pages: [], metadata: {} };
        $documents = addDocument(document.type, compressed.base64, document);

        // Store capture metadata for event emission on review confirmation (AC5)
        setPendingCaptureMetadata({
          documentType: documentType as 'omang' | 'passport' | 'driversLicense',
          side: 'front',
          imageSize: compressed.blob.size,
          compressionRatio: compressed.compressionRatio,
          captureTime,
          cameraResolution,
        });

        return goToNextStep(currentStepId, $configuration, $currentStepId);
      }
      return goToPrevStep(currentStepId, $configuration, $currentStepId);
    } catch (error) {
      console.error('Image capture/compression failed:', error);
      toggleOffIsDisabled();
    } finally {
      isCompressing = false;
    }
  };

  const handleTryAgain = () => {
    cameraError = null;
    // Retry camera initialization
    if (video && cameraPhoto) {
      cameraPhoto
        .startCamera(FACING_MODES.ENVIRONMENT, {
          width: 1920,
          height: 1080,
        })
        .then(cameraStream => {
          stream = cameraStream;
          cameraError = null;
        })
        .catch(error => {
          cameraError = error.message || 'Camera access denied';
        });
    }
  };

  const handleUploadInstead = () => {
    // Navigate to upload fallback (Story 1.4)
    // Navigate to DocumentUpload step by setting the step ID directly
    currentStepId.set('document-upload');
  };

  preloadNextStepByCurrent($configuration, configuration, $currentStepId, $uiPack);
</script>

<div class="container" {style} bind:this={container}>
  {#if cameraError}
    <!-- Camera Permission Error State -->
    <div class="error-container">
      <div class="error-content">
        <h2 class="error-title">
          <T key={`${stepNamespace}.errors.cameraPermissionDenied`} />
        </h2>
        <p class="error-description">
          <T key={`${stepNamespace}.errors.cameraPermissionInstructions`} />
        </p>
        <div class="error-actions">
          <button class="btn-try-again" on:click={handleTryAgain}>
            <T key={`${stepNamespace}.errors.tryAgain`} />
          </button>
          <button class="btn-upload" on:click={handleUploadInstead}>
            <T key={`${stepNamespace}.errors.uploadInstead`} />
          </button>
        </div>
      </div>
    </div>
  {:else}
    <!-- Normal Camera View -->
    {#each step.elements as element}
      {#if element.type === Elements.IconButton}
        <IconButton
          configuration={element.props}
          on:click={() => goToPrevStep(currentStepId, $configuration, $currentStepId)}
        />
      {/if}
      {#if element.type === Elements.IconCloseButton}
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
      {#if element.type === Elements.VideoContainer}
        <VideoContainer configuration={element.props}>
          <!-- svelte-ignore a11y-media-has-caption -->
          <video bind:this={video} autoplay playsinline />
        </VideoContainer>
      {/if}
      {#if element.type === Elements.Loader && (stream === undefined || isCompressing)}
        <Loader />
      {/if}
    {/each}
    <div class="header">
      {#each step.elements as element}
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
      {/each}
    </div>
    {#if documentType}
      <Overlay type={documentType} />
    {/if}
    {#if stream && !isCompressing}
      <QualityFeedback feedback={qualityFeedback} {documentType} />
    {/if}
    {#each step.elements as element}
      {#if element.type === Elements.CameraButton}
        <CameraButton
          on:click={handleTakePhoto}
          configuration={element.props}
          isDisabled={$isDisabled || isCompressing}
        />
      {/if}
    {/each}
  {/if}
</div>

<style>
  .container {
    height: 100%;
    position: var(--position);
    background: var(--background);
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
  }

  .header {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
  }

  /* Camera Permission Error Styles */
  .error-container {
    display: flex;
    align-items: center;
    justify-content: center;
    height: 100%;
    padding: 24px;
  }

  .error-content {
    max-width: 400px;
    text-align: center;
  }

  .error-title {
    font-size: 20px;
    font-weight: 600;
    color: var(--text-color, #1f2937);
    margin-bottom: 12px;
  }

  .error-description {
    font-size: 14px;
    color: var(--text-secondary, #6b7280);
    margin-bottom: 24px;
    line-height: 1.5;
  }

  .error-actions {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .btn-try-again,
  .btn-upload {
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    border: none;
    min-height: 44px;
  }

  .btn-try-again {
    background: #75aadb;
    color: #fff;
  }

  .btn-try-again:hover {
    background: #5a8fc4;
  }

  .btn-upload {
    background: transparent;
    color: #75aadb;
    border: 2px solid #75aadb;
  }

  .btn-upload:hover {
    background: rgba(117, 170, 219, 0.1);
  }

  @media (max-width: 576px) {
    .error-title {
      font-size: 18px;
    }

    .error-description {
      font-size: 13px;
    }

    .btn-try-again,
    .btn-upload {
      font-size: 14px;
    }
  }

  /* Dark theme support */
  @media (prefers-color-scheme: dark) {
    .error-title {
      color: #f9fafb;
    }

    .error-description {
      color: #d1d5db;
    }

    .btn-upload {
      color: #93c5fd;
      border-color: #93c5fd;
    }

    .btn-upload:hover {
      background: rgba(147, 197, 253, 0.1);
    }
  }
</style>
