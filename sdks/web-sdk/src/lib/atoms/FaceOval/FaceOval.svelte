<script lang="ts">
  export let width = 280;
  export let height = 360;
  export let borderColor = '#75aadb';
  export let borderWidth = 3;
</script>

<div
  class="face-oval"
  style="width: {width}px; height: {height}px; border: {borderWidth}px solid {borderColor};"
  aria-hidden="true"
  data-testid="face-oval"
></div>

<style>
  .face-oval {
    position: absolute;
    top: 50%;
    left: 50%;
    transform: translate(-50%, -50%);
    border-radius: 50%;
    pointer-events: none;
  }

  /* Responsive design */
  @media (max-width: 768px) {
    .face-oval {
      width: 240px;
      height: 320px;
    }
  }

  /* Dark theme support */
  @media (prefers-color-scheme: dark) {
    .face-oval {
      border-color: #93c5fd;
    }
  }
</style>
