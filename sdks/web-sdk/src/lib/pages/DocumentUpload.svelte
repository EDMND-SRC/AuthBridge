<script lang="ts">
  import { T } from '../contexts/translation';
  import { configuration } from '../contexts/configuration';
  import { onMount } from 'svelte';
  import { Title, IconButton, Paragraph, IconCloseButton, Loader } from '../atoms';
  import { Elements } from '../contexts/configuration/types';
  import { DocumentType, IDocument, appState } from '../contexts/app-state';
  import { goToNextStep, goToPrevStep } from '../contexts/navigation';
  import { documents, currentStepId, selectedDocumentInfo } from '../contexts/app-state/stores';
  import { setPendingUploadMetadata } from '../contexts/app-state/stores';
  import {
    EActionNames,
    EVerificationStatuses,
    sendButtonClickEvent,
  } from '../utils/event-service';
  import { getLayoutStyles, getStepConfiguration, uiPack } from '../ui-packs';
  import { validateFile, formatFileSize } from '../services/file-validation';
  import { compressImage } from '../services/image-compression';

  export let stepId;

  const step = getStepConfiguration($configuration, $uiPack, stepId);
  const style = getLayoutStyles($configuration, $uiPack, step);

  const documentType =
    (($configuration.steps && $configuration.steps[$currentStepId].type) as DocumentType) ||
    ($uiPack.steps[$currentStepId].type as DocumentType) ||
    $selectedDocumentInfo.type;

  const stepNamespace = `document-upload.${documentType}`;

  let fileInput: HTMLInputElement;
  let selectedFile: File | null = null;
  let fileName: string = '';
  let fileSize: string = '';
  let errorMessage: string = '';
  let isProcessing = false;
  let isDragging = false;

  $: {
    if (!documentType) goToPrevStep(currentStepId, $configuration, $currentStepId);
  }

  const clearDocs = (type: DocumentType): IDocument[] => {
    const { options } = $configuration.documentOptions || $uiPack.documentOptions;
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

  const handleFileSelect = async (file: File, method: 'button' | 'dragDrop') => {
    errorMessage = '';
    selectedFile = file;
    fileName = file.name;
    fileSize = formatFileSize(file.size);

    // Validate file
    const validation = await validateFile(file);
    if (!validation.valid) {
      errorMessage = validation.error?.message || 'Invalid file';
      selectedFile = null;
      fileName = '';
      fileSize = '';
      return;
    }

    // Process upload
    await processUpload(file, method);
  };

  const processUpload = async (file: File, method: 'button' | 'dragDrop') => {
    isProcessing = true;
    const uploadStartTime = Date.now();

    try {
      // Convert file to blob for compression
      const blob = file.slice(0, file.size, file.type);

      // Compress image
      const compressed = await compressImage(blob, {
        quality: 0.85,
        maxWidth: 1920,
        maxHeight: 1080,
      });

      const uploadTime = Date.now() - uploadStartTime;

      if (documentType) {
        const document = { type: documentType, pages: [], metadata: {} };
        $documents = addDocument(document.type, compressed.base64, document);

        // Store upload metadata for event emission on review confirmation (AC5)
        setPendingUploadMetadata({
          documentType: documentType as 'omang' | 'passport' | 'driversLicense',
          side: 'front',
          fileName: file.name,
          originalSize: file.size,
          compressedSize: compressed.blob.size,
          compressionRatio: compressed.compressionRatio,
          uploadTime,
          uploadMethod: method,
        });

        return goToNextStep(currentStepId, $configuration, $currentStepId);
      }
      return goToPrevStep(currentStepId, $configuration, $currentStepId);
    } catch (error) {
      console.error('Upload/compression failed:', error);
      // Use translation key for error message - fallback to English if translation fails
      errorMessage = $configuration?.translations?.['document-upload']?.errors?.uploadFailed || 'Upload failed. Please try again.';
    } finally {
      isProcessing = false;
    }
  };

  const handleFileInputChange = (e: Event) => {
    const input = e.target as HTMLInputElement;
    const files = input.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0], 'button');
    }
  };

  const handleDragEnter = (e: DragEvent) => {
    e.preventDefault();
    isDragging = true;
  };

  const handleDragLeave = (e: DragEvent) => {
    e.preventDefault();
    isDragging = false;
  };

  const handleDragOver = (e: DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    isDragging = false;

    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0], 'dragDrop');
    }
  };

  const handleUploadClick = () => {
    fileInput?.click();
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

  {#if isProcessing}
    <Loader />
    <p class="processing-text">
      <T key={'processing'} namespace="document-upload" />
    </p>
  {:else}
    <div
      class="upload-zone"
      class:dragging={isDragging}
      on:dragenter={handleDragEnter}
      on:dragleave={handleDragLeave}
      on:dragover={handleDragOver}
      on:drop={handleDrop}
      on:click={handleUploadClick}
      role="button"
      tabindex="0"
      aria-label="Upload document. Click or drag and drop a file here."
      on:keydown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleUploadClick();
        }
      }}
    >
      <input
        type="file"
        accept="image/jpeg,image/png,application/pdf"
        bind:this={fileInput}
        on:change={handleFileInputChange}
        style="display: none;"
      />

      <div class="upload-icon">📄</div>
      <p class="upload-text">
        <T key={'dragDropZone'} namespace="document-upload" />
      </p>

      {#if fileName}
        <p class="file-info">
          {fileName} ({fileSize})
        </p>
      {/if}

      {#if errorMessage}
        <p class="error-message">{errorMessage}</p>
      {/if}
    </div>

    <button class="upload-button" on:click={handleUploadClick}>
      <T key={'uploadButton'} namespace="document-upload" />
    </button>
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
    padding: 24px;
  }

  .header {
    text-align: center;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    margin-bottom: 32px;
  }

  .upload-zone {
    border: 2px dashed #75aadb;
    border-radius: 12px;
    padding: 48px 32px;
    margin: 24px 0;
    cursor: pointer;
    transition: all 0.2s ease;
    background: #fff;
    width: 100%;
    max-width: 500px;
  }

  .upload-zone:hover {
    border-color: #5a8fc4;
    background: rgba(117, 170, 219, 0.05);
  }

  .upload-zone.dragging {
    border-color: #5a8fc4;
    background: rgba(117, 170, 219, 0.1);
    transform: scale(1.02);
  }

  .upload-zone:focus {
    outline: 2px solid #75aadb;
    outline-offset: 2px;
  }

  .upload-icon {
    font-size: 48px;
    margin-bottom: 16px;
  }

  .upload-text {
    font-size: 16px;
    color: #6b7280;
    margin: 0;
  }

  .file-info {
    font-size: 14px;
    color: #10b981;
    margin-top: 12px;
    font-weight: 500;
  }

  .error-message {
    font-size: 14px;
    color: #ef4444;
    margin-top: 12px;
    padding: 8px 12px;
    background: rgba(239, 68, 68, 0.1);
    border-radius: 6px;
  }

  .upload-button {
    padding: 14px 32px;
    background: #75aadb;
    color: #fff;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 500;
    cursor: pointer;
    transition: all 0.2s;
    min-height: 48px;
    width: 100%;
    max-width: 500px;
  }

  .upload-button:hover {
    background: #5a8fc4;
  }

  .upload-button:focus {
    outline: 2px solid #75aadb;
    outline-offset: 2px;
  }

  .processing-text {
    font-size: 16px;
    color: #6b7280;
    margin-top: 16px;
  }

  @media (max-width: 768px) {
    .upload-zone {
      padding: 32px 24px;
    }

    .upload-icon {
      font-size: 36px;
    }

    .upload-text {
      font-size: 14px;
    }

    .upload-button {
      font-size: 14px;
      min-height: 44px;
    }
  }

  /* Dark theme support */
  @media (prefers-color-scheme: dark) {
    .upload-zone {
      background: #1f2937;
      border-color: #93c5fd;
    }

    .upload-zone:hover {
      border-color: #60a5fa;
      background: rgba(147, 197, 253, 0.1);
    }

    .upload-text {
      color: #d1d5db;
    }

    .file-info {
      color: #34d399;
    }

    .processing-text {
      color: #d1d5db;
    }
  }
</style>
