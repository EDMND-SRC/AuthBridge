<script lang="ts">
  import { T } from '../../contexts/translation';
  import type { QualityFeedback as QualityFeedbackType } from '../../utils/photo-utils';

  export let feedback: QualityFeedbackType;
  export let documentType: string = 'omang';

  // Use 'document-photo' namespace to match translation.json structure
  $: lightingKey = `document-photo.${documentType}.qualityFeedback.lighting.${feedback.lighting}`;
  $: blurKey = `document-photo.${documentType}.qualityFeedback.blur.${feedback.blur}`;
  $: glareKey = `document-photo.${documentType}.qualityFeedback.glare.${feedback.glare}`;

  $: lightingClass = feedback.lighting === 'good' ? 'success' : 'warning';
  $: blurClass = feedback.blur === 'good' ? 'success' : 'warning';
  $: glareClass = feedback.glare === 'good' ? 'success' : 'warning';
</script>

<div class="quality-feedback" data-testid="quality-feedback">
  <div class="feedback-item {lightingClass}" data-testid="quality-feedback-lighting">
    <span class="icon">{feedback.lighting === 'good' ? '✓' : '⚠'}</span>
    <T key={lightingKey} />
  </div>
  <div class="feedback-item {blurClass}" data-testid="quality-feedback-blur">
    <span class="icon">{feedback.blur === 'good' ? '✓' : '⚠'}</span>
    <T key={blurKey} />
  </div>
  <div class="feedback-item {glareClass}" data-testid="quality-feedback-glare">
    <span class="icon">{feedback.glare === 'good' ? '✓' : '⚠'}</span>
    <T key={glareKey} />
  </div>
</div>

<style>
  .quality-feedback {
    position: absolute;
    top: 80px;
    left: 50%;
    transform: translateX(-50%);
    z-index: 3;
    display: flex;
    flex-direction: column;
    gap: 8px;
    padding: 12px 16px;
    background: rgba(0, 0, 0, 0.7);
    border-radius: 8px;
    backdrop-filter: blur(4px);
  }

  .feedback-item {
    display: flex;
    align-items: center;
    gap: 8px;
    font-size: 14px;
    font-weight: 500;
    color: #fff;
  }

  .feedback-item.success {
    color: #10b981;
  }

  .feedback-item.warning {
    color: #f59e0b;
  }

  .icon {
    font-size: 16px;
  }

  @media (max-width: 576px) {
    .quality-feedback {
      top: 60px;
      font-size: 12px;
      padding: 10px 14px;
      gap: 6px;
    }

    .feedback-item {
      font-size: 12px;
    }

    .icon {
      font-size: 14px;
    }
  }

  /* Dark theme support */
  @media (prefers-color-scheme: dark) {
    .quality-feedback {
      background: rgba(0, 0, 0, 0.85);
    }
  }
</style>
