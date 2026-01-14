<script lang="ts">
  import { IconButton, IconCloseButton, Image, NextStepButton, Paragraph, Title, PrivacyLink } from '../atoms';
  import { configuration } from '../contexts/configuration';
  import { Elements } from '../contexts/configuration/types';
  import List from '../molecules/List/List.svelte';
  import { T } from '../contexts/translation';
  import { sendButtonClickEvent, sendVerificationStartedEvent } from '../utils/event-service/utils';
  import { appState } from '../contexts/app-state';
  import { preloadNextStepByCurrent } from '../services/preload-service';
  import { EActionNames, EVerificationStatuses } from '../utils/event-service';
  import { getLayoutStyles, getStepConfiguration, uiPack } from '../ui-packs';
  import { getFlowConfig } from '../contexts/flows/hooks';
  import { t } from '../contexts/translation/hooks';

  export let stepId;

  const step = getStepConfiguration($configuration, $uiPack, stepId);
  const flow = getFlowConfig($configuration);
  const style = getLayoutStyles($configuration, $uiPack, step);

  const stepNamespace = step.namespace!;

  preloadNextStepByCurrent($configuration, configuration, stepId, $uiPack);

  // Handle Start Verification button click
  const handleStartVerification = () => {
    // Emit verification.started event (AC5)
    const sessionId = $configuration.endUserInfo?.id || 'unknown';
    const clientId = $configuration.backendConfig?.auth?.clientId;
    sendVerificationStartedEvent(sessionId, clientId);
  };

  // Get privacy policy URL from translation or config
  const privacyPolicyUrl = t('privacyPolicyUrl', stepNamespace) || 'https://authbridge.io/privacy';
</script>

<div class="container" {style}>
  {#each step.elements as element}
    {#if element.type === Elements.IconButton && flow.firstScreenBackButton}
      <div>
        <IconButton
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
      </div>
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
    {#if element.type === Elements.Image}
      <Image configuration={element.props} />
    {/if}
    {#if element.type === Elements.Title}
      <Title configuration={element.props}>
        <T key="title" namespace={stepNamespace} />
      </Title>
    {/if}
    {#if element.type === Elements.Paragraph}
      <Paragraph configuration={element.props}>
        <T key={element.props.context || 'description'} namespace={stepNamespace} />
      </Paragraph>
    {/if}
    {#if element.type === Elements.PrivacyLink}
      <PrivacyLink configuration={element.props} namespace={stepNamespace} url={privacyPolicyUrl} />
    {/if}
    {#if element.type === Elements.List}
      <List configuration={element.props} />
    {/if}
    {#if element.type === Elements.Button}
      <NextStepButton configuration={element.props} on:click={handleStartVerification}>
        <T key="button" namespace={stepNamespace} />
      </NextStepButton>
    {/if}
  {/each}
</div>

<style>
  .container {
    display: flex;
    flex-direction: column;
    height: 100%;
    padding: var(--padding);
    position: var(--position);
    background: var(--background);
    line-height: var(--line-height);
    text-align: center;
  }
</style>
