<script lang="ts">
  import { T } from '../../contexts/translation';
  import { uiPack } from '../../ui-packs';

  export let configuration = {};
  export let namespace = 'welcome';
  export let url = '';

  const style = Object.entries(configuration?.style || {})
    .map(([key, value]) => `${key}: ${value}`)
    .join('; ');

  const handleClick = (e: MouseEvent) => {
    e.preventDefault();
    window.open(url, '_blank', 'noopener,noreferrer');
  };
</script>

<p class="privacy-text" {style}>
  <T key="privacyPolicy" {namespace} />
  <a href={url} on:click={handleClick} class="privacy-link" target="_blank" rel="noopener noreferrer">
    <T key="privacyPolicyLink" {namespace} />
  </a>
</p>

<style>
  .privacy-text {
    margin: 16px 0px 24px;
    text-align: center;
    font-size: 12px;
    color: #788597;
  }

  .privacy-link {
    color: var(--primary-color, #75AADB);
    text-decoration: underline;
    cursor: pointer;
    margin-left: 4px;
  }

  .privacy-link:hover {
    opacity: 0.8;
  }
</style>
