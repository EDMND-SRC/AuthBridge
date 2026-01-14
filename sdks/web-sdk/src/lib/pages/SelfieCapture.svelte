<script lang="ts">
  import { onMount, onDestroy } from 'svelte';
  import { T } from '../contexts/translation';
  import { configuration } from '../contexts/configuration';
  import { currentStepId } from '../contexts/app-state/stores';
  import { goToPrevStep, goToNextStep } from '../contexts/navigation';
  import { getLayoutStyles, getStepConfiguration, uiPack } from '../ui-packs';
  import { Elements } from '../contexts/configuration/types';
  import { IconButton, IconCloseButton, Title, Paragraph, Loader } from '../atoms';
  import { FaceOval } from '../atoms/FaceOval';
  import {
    EActionNames,
    EVerificationStatuses,
    sendButtonClickEvent,
  } from '../utils/event-service';
  import { appState } from '../contexts/app-state';
  import { compressImage } from '../services/image-compression';
  import { setPendingSelfieMetadata } from '../contexts/app-state/stores';
  import {
    LivenessDetector,
    type FacePositioning,
    type LivenessChecks,
    type LivenessPrompt,
  } from '../services/liveness-detection';
  import type { Results } from '@mediapipe/face_mesh';

  export let stepId: string;

  let videoElement: HTMLVideoElement;
  let canvasElement: HTMLCanvasElement;
  let stream: MediaStream | undefined;
  let cameraError: string | null = null;
  let isCompressing = false;
  let livenessDetector: LivenessDetector | null = null;

  let currentPrompt: LivenessPrompt = 'position';
  let livenessChecks: LivenessChecks = {
    blink: { passed: false, attempts: 0 },
    turnLeft: { passed: false, attempts: 0 },
    turnRight: { passed: false, attempts: 0 },
  };
  let totalAttempts = 0;
  let facePositioning: FacePositioning = {
    centered: false,
    distance: 'tooFar',
    message: 'Position your face in the oval',
  };
  let captureEnabled = false;
  let promptTimeout: number | undefined;
  let showSupportLink = false;
  let compressionError: string | null = null;
  const MAX_ATTEMPTS = 3;
  const PROMPT_TIMEOUT_MS = 10000; // 10 seconds per prompt

  const step = getStepConfiguration($configuration, $uiPack, stepId);
  const style = getLayoutStyles($configuration, $uiPack, step);
  const stepNamespace = `${step.namespace}.selfie`;

  onMount(async () => {
    await initializeCamera();
  });

  async function initializeCamera() {
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user' },
      });
      if (videoElement) {
        videoElement.srcObject = stream;
        await videoElement.play();
        await initializeLivenessDetection();
      }
      cameraError = null;
    } catch (error) {
      console.error('Camera access denied:', error);
      cameraError = error instanceof Error ? error.message : 'Camera access denied';
    }
  }

  async function initializeLivenessDetection() {
    if (!videoElement) return;

    livenessDetector = new LivenessDetector();
    await livenessDetector.initialize(videoElement, onFaceMeshResults);
  }

  function onFaceMeshResults(results: Results) {
    if (!results.multiFaceLandmarks || results.multiFaceLandmarks.length === 0) {
      facePositioning = {
        centered: false,
        distance: 'tooFar',
        message: 'No face detected',
      };
      captureEnabled = false;
      return;
    }

    const landmarks = results.multiFaceLandmarks[0];

    // Analyze face positioning
    if (livenessDetector) {
      facePositioning = livenessDetector.analyzeFacePositioning(landmarks);
    }

    // Enable capture only if face is properly positioned
    const isPositioned = facePositioning.centered && facePositioning.distance === 'optimal';

    // Run liveness checks based on current prompt
    if (isPositioned && livenessDetector) {
      runLivenessCheck(landmarks);
    } else {
      captureEnabled = false;
    }
  }

  function runLivenessCheck(landmarks: any[]) {
    if (!livenessDetector) return;

    switch (currentPrompt) {
      case 'position':
        // Move to blink check
        currentPrompt = 'blink';
        livenessChecks.blink.attempts++;
        startPromptTimeout();
        break;

      case 'blink':
        if (livenessDetector.detectBlink(landmarks)) {
          livenessChecks.blink.passed = true;
          clearPromptTimeout();
          currentPrompt = 'turnLeft';
          livenessChecks.turnLeft.attempts++;
          startPromptTimeout();
        }
        break;

      case 'turnLeft':
        if (livenessDetector.detectHeadTurn(landmarks, 'left')) {
          livenessChecks.turnLeft.passed = true;
          clearPromptTimeout();
          currentPrompt = 'turnRight';
          livenessChecks.turnRight.attempts++;
          startPromptTimeout();
        }
        break;

      case 'turnRight':
        if (livenessDetector.detectHeadTurn(landmarks, 'right')) {
          livenessChecks.turnRight.passed = true;
          clearPromptTimeout();
          currentPrompt = 'complete';
          captureEnabled = true;
        }
        break;
    }
  }

  function startPromptTimeout() {
    clearPromptTimeout();
    promptTimeout = window.setTimeout(() => {
      handlePromptTimeout();
    }, PROMPT_TIMEOUT_MS);
  }

  function clearPromptTimeout() {
    if (promptTimeout) {
      clearTimeout(promptTimeout);
      promptTimeout = undefined;
    }
  }

  function handlePromptTimeout() {
    totalAttempts++;

    // Check if max attempts reached
    if (totalAttempts >= MAX_ATTEMPTS) {
      showSupportLink = true;
      facePositioning.message = 'Having trouble? Contact support';
      return;
    }

    // Reset current check and try again
    switch (currentPrompt) {
      case 'blink':
        livenessChecks.blink.attempts++;
        facePositioning.message = 'Please blink naturally. Try again.';
        break;
      case 'turnLeft':
        livenessChecks.turnLeft.attempts++;
        facePositioning.message = 'Please turn your head left. Try again.';
        break;
      case 'turnRight':
        livenessChecks.turnRight.attempts++;
        facePositioning.message = 'Please turn your head right. Try again.';
        break;
    }

    // Restart timeout for retry
    startPromptTimeout();
  }

  async function handleCapture() {
    if (!captureEnabled || !videoElement || !canvasElement) return;

    isCompressing = true;
    compressionError = null;
    const captureStartTime = Date.now();

    try {
      // Capture frame from video to canvas
      const context = canvasElement.getContext('2d');
      if (!context) throw new Error('Canvas context not available');

      canvasElement.width = videoElement.videoWidth;
      canvasElement.height = videoElement.videoHeight;
      context.drawImage(videoElement, 0, 0);

      // Convert canvas to blob
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvasElement.toBlob(
          blob => {
            if (blob) resolve(blob);
            else reject(new Error('Failed to create blob'));
          },
          'image/jpeg',
          0.95,
        );
      });

      // Compress image
      const compressed = await compressImage(blob, {
        quality: 0.85,
        maxWidth: 1920,
        maxHeight: 1080,
      });

      const captureTime = Date.now() - captureStartTime;
      const cameraResolution = `${videoElement.videoWidth}x${videoElement.videoHeight}`;

      // Store metadata for event emission (including camera resolution)
      setPendingSelfieMetadata({
        fileName: `selfie_${Date.now()}.jpg`,
        originalSize: blob.size,
        compressedSize: compressed.blob.size,
        compressionRatio: compressed.compressionRatio,
        captureTime,
        cameraResolution,
        livenessChecks,
        totalAttempts,
        faceQuality: facePositioning,
      });

      // Navigate to CheckDocument review screen
      goToNextStep(currentStepId, $configuration, $currentStepId);
    } catch (error) {
      console.error('Selfie capture/compression failed:', error);
      compressionError = error instanceof Error ? error.message : 'Failed to process selfie. Please try again.';
    } finally {
      isCompressing = false;
    }
  }

  function handleTryAgain() {
    cameraError = null;
    initializeCamera();
  }

  onDestroy(() => {
    clearPromptTimeout();
    if (livenessDetector) {
      livenessDetector.stop();
    }
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
    }
  });
</script>

<div class="selfie-capture" {style}>
  {#if cameraError}
    <!-- Camera Permission Error State (AC7) -->
    <div class="error-container">
      <div class="error-content">
        <h2 class="error-title">Camera access denied</h2>
        <p class="error-description">
          To take a selfie, please enable camera access in your browser settings
        </p>
        <div class="error-actions">
          <button class="btn-try-again" on:click={handleTryAgain}>
            Try Again
          </button>
        </div>
      </div>
    </div>
  {:else}
    <!-- Normal Camera View (AC1, AC2, AC3) -->
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
      <Title configuration={step.elements.find(e => e.type === Elements.Title)?.props || {}}>
        <T key={'title'} namespace={stepNamespace} />
      </Title>
      <Paragraph configuration={step.elements.find(e => e.type === Elements.Paragraph)?.props || {}}>
        <T key={'description'} namespace={stepNamespace} />
      </Paragraph>
    </div>

    <div class="video-container">
      {#if stream === undefined || isCompressing}
        <Loader />
      {:else}
        <!-- svelte-ignore a11y-media-has-caption -->
        <video
          bind:this={videoElement}
          autoplay
          playsinline
          class="video"
          aria-label="Selfie camera preview"
          role="img"
        />
        <!-- Face oval overlay (AC2) -->
        <FaceOval />

        <!-- Liveness prompt (AC3) -->
        {#if currentPrompt !== 'position' && currentPrompt !== 'complete'}
          <div class="liveness-prompt" role="status" aria-live="polite">
            {#if currentPrompt === 'blink'}
              <p>Blink naturally</p>
              <div class="progress">1 of 3 checks complete</div>
            {:else if currentPrompt === 'turnLeft'}
              <p>Turn head slightly left</p>
              <div class="progress">2 of 3 checks complete</div>
            {:else if currentPrompt === 'turnRight'}
              <p>Turn head slightly right</p>
              <div class="progress">2 of 3 checks complete</div>
            {/if}
          </div>
        {/if}
      {/if}
    </div>

    <!-- Positioning feedback (AC2, AC6) -->
    <div class="feedback" role="status" aria-live="polite">{facePositioning.message}</div>

    <!-- Compression error message -->
    {#if compressionError}
      <div class="error-message" role="alert">
        <p>{compressionError}</p>
        <button class="btn-retry" on:click={() => { compressionError = null; captureEnabled = true; }}>
          Try Again
        </button>
      </div>
    {/if}

    <!-- Support link after 3 failed attempts (AC6) -->
    {#if showSupportLink}
      <div class="support-link">
        <a href="mailto:support@authbridge.com" target="_blank" rel="noopener noreferrer">
          Having trouble? Contact support
        </a>
      </div>
    {/if}

    <!-- Capture button (AC2, AC4) -->
    <button
      class="btn-capture"
      on:click={handleCapture}
      disabled={!captureEnabled || isCompressing}
      aria-label="Capture selfie photo"
    >
      {isCompressing ? 'Processing...' : 'Capture Selfie'}
    </button>

    <!-- Hidden canvas for capture -->
    <canvas bind:this={canvasElement} style="display: none;"></canvas>
  {/if}
</div>

<style>
  .selfie-capture {
    height: 100%;
    position: var(--position);
    background: var(--background);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: space-between;
    padding: 24px;
  }

  .header {
    text-align: center;
    margin-bottom: 16px;
  }

  .video-container {
    position: relative;
    width: 100%;
    max-width: 400px;
    aspect-ratio: 3 / 4;
    border-radius: 16px;
    overflow: hidden;
    background: #000;
  }

  .video {
    width: 100%;
    height: 100%;
    object-fit: cover;
  }

  /* Liveness prompt (AC3) */
  .liveness-prompt {
    position: absolute;
    bottom: 20px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.7);
    color: #fff;
    padding: 12px 24px;
    border-radius: 8px;
    text-align: center;
    pointer-events: none;
  }

  .liveness-prompt p {
    margin: 0 0 8px 0;
    font-size: 16px;
    font-weight: 600;
  }

  .liveness-prompt .progress {
    font-size: 14px;
    color: #10b981;
  }

  .support-link {
    margin: 8px 0;
    text-align: center;
  }

  .support-link a {
    color: #ef4444;
    font-size: 14px;
    font-weight: 500;
    text-decoration: underline;
  }

  .support-link a:hover {
    color: #dc2626;
  }

  .feedback {
    margin: 16px 0;
    font-size: 16px;
    font-weight: 500;
    color: var(--text-color, #1f2937);
    text-align: center;
  }

  .btn-capture {
    padding: 16px 32px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    background: #75aadb;
    color: #fff;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    min-height: 44px;
    min-width: 200px;
  }

  .btn-capture:hover:not(:disabled) {
    background: #5a8fc4;
  }

  .btn-capture:disabled {
    background: #d1d5db;
    cursor: not-allowed;
  }

  .btn-capture:focus-visible {
    outline: 3px solid #75aadb;
    outline-offset: 2px;
  }

  .error-message {
    background: #fef2f2;
    border: 1px solid #ef4444;
    border-radius: 8px;
    padding: 12px;
    margin: 12px 0;
    text-align: center;
  }

  .error-message p {
    color: #dc2626;
    font-size: 14px;
    margin: 0 0 8px 0;
  }

  .btn-retry {
    padding: 8px 16px;
    border-radius: 6px;
    font-size: 14px;
    font-weight: 500;
    background: #ef4444;
    color: #fff;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
  }

  .btn-retry:hover {
    background: #dc2626;
  }

  /* Camera Permission Error Styles (AC7) */
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

  .btn-try-again {
    padding: 12px 24px;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 500;
    background: #75aadb;
    color: #fff;
    border: none;
    cursor: pointer;
    transition: all 0.2s;
    min-height: 44px;
  }

  .btn-try-again:hover {
    background: #5a8fc4;
  }

  /* Responsive design (AC8) */
  @media (max-width: 768px) {
    .video-container {
      max-width: 100%;
    }

    .btn-capture {
      width: 100%;
    }
  }

  /* Dark theme support */
  @media (prefers-color-scheme: dark) {
    .feedback {
      color: #f9fafb;
    }

    .error-title {
      color: #f9fafb;
    }

    .error-description {
      color: #d1d5db;
    }
  }
</style>
