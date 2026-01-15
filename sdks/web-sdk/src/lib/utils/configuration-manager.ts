/**
 * Configuration Manager
 * TD-006: Refactored to remove file-level eslint-disable directives
 * Added proper typing throughout
 */
import mergeObj from 'deepmerge';
import translation from '../configuration/translation.json';
import { TranslationType } from '../contexts/translation';
import {
  configuration,
  IAppConfiguration,
  IStepConfiguration,
  Steps,
} from '../contexts/configuration';
import { FlowsEventsConfig, FlowsInitOptions, FlowsTranslations } from '../../types/BallerineSDK';
import { IFlow } from '../contexts/flows';
import { IDocumentOptionItem } from '../organisms/DocumentOptions/types';
import { AnyRecord } from '../../types';
import { preloadStepImages } from '../services/preload-service/utils';
import { packs, uiPack } from '../ui-packs';
import { isUrl } from '../services/merge-service';

/**
 * Type for recursive partial objects
 */
type RecursivePartial<T> = {
  [P in keyof T]?: T[P] extends object ? RecursivePartial<T[P]> : T[P];
};

/**
 * Type for keyBy result
 */
type KeyedObject<T> = Record<string, T>;

/**
 * Convert array to object keyed by specified property
 * TD-006: Added proper typing
 */
function keyBy<T extends Record<string, unknown>>(
  array: T[] | undefined,
  key: string | ((item: T) => string)
): KeyedObject<T> {
  if (!array) return {};
  return array.reduce<KeyedObject<T>>((result, item) => {
    const calculatedKey = typeof key === 'function' ? key(item) : String(item[key] ?? '');
    result[calculatedKey] = item;
    return result;
  }, {});
}

/**
 * Convert collection to object keyed by specified property
 */
function toObjByKey<T extends Record<string, unknown>>(
  collection: T[] | Record<string, T> | undefined,
  key: string | ((item: T) => string)
): KeyedObject<T> {
  if (!collection) return {};
  const items = Array.isArray(collection) ? collection : Object.values(collection);
  return keyBy(items, key);
}

export let texts: TranslationType = translation;

export const updateConfiguration = async (
  configOverrides: RecursivePartial<FlowsInitOptions>
): Promise<void> => {
  let configurationResult: IAppConfiguration | undefined = undefined;
  let uiTheme = packs.default;

  configuration.update(currentConfig => {
    const mergedConfig = mergeConfig(currentConfig, configOverrides);
    configurationResult = mergedConfig;
    return mergedConfig;
  });

  const config = configurationResult as unknown as IAppConfiguration;
  const pack = configOverrides.uiConfig?.uiPack as string | undefined;

  if (pack && isUrl(pack)) {
    const packConfigResponse = await fetch(pack);
    const packConfig = await packConfigResponse.json();
    uiPack.set(packConfig);
  } else if (pack && Object.keys(packs).includes(pack)) {
    const packName = pack as keyof typeof packs;
    uiPack.set(packs[packName]);
    uiTheme = packs[packName];
  }

  config.steps[Steps.Welcome] = await preloadStepImages(config.steps[Steps.Welcome], uiTheme);
  configuration.update(() => config);
};

export const updateTranslations = async (translations: FlowsTranslations): Promise<void> => {
  if (translations.overrides) {
    texts = mergeObj(texts, translations.overrides);
  }
  if (translations.remoteUrl) {
    try {
      const response = await fetch(translations.remoteUrl);
      const overrides = (await response.json()) as TranslationType;
      texts = mergeObj(texts, overrides);
    } catch {
      // TD-009: Silent failure for translation fetch - graceful degradation
    }
  }
};

export const mergeConfig = (
  originalConfig: IAppConfiguration,
  overrides: RecursivePartial<FlowsInitOptions>
): IAppConfiguration => {
  const adaptedOverrides = v1adapter(overrides, originalConfig);
  const newConfig: IAppConfiguration = mergeObj(originalConfig, adaptedOverrides) as IAppConfiguration;

  if (
    newConfig.steps &&
    newConfig.steps[Steps.DocumentSelection] &&
    newConfig.steps[Steps.DocumentSelection].documentOptions &&
    newConfig.documentOptions
  ) {
    const documentOptions = newConfig.steps[Steps.DocumentSelection].documentOptions?.reduce(
      (docOpts, docType) => {
        if (newConfig.documentOptions?.options[docType]) {
          docOpts[docType] = newConfig.documentOptions.options[docType];
        }
        return docOpts;
      },
      {} as IDocumentOptionItem
    );

    if (documentOptions) {
      newConfig.documentOptions.options = documentOptions;
    }
  }
  return newConfig;
};

/**
 * Calculate step ID from step configuration
 */
const calculateStepId = (step: RecursivePartial<IStepConfiguration>): string => {
  if (!step.id || step.id === step.name) {
    return `${step.name ?? ''}${step.type ? '-' + step.type : ''}`;
  }
  return step.id;
};

/**
 * Adapt v1 config format to internal format
 * TD-006: Refactored with proper typing
 */
const v1adapter = (
  config: RecursivePartial<FlowsInitOptions>,
  originalConfig: IAppConfiguration
): AnyRecord => {
  const { uiConfig = {}, endUserInfo = {}, backendConfig = {} } = config;
  const { flows = {}, general, components } = uiConfig;

  const newFlows: Record<string, IFlow> = {};
  let flowSteps: Record<string, RecursivePartial<IStepConfiguration>> = {};

  for (const [flowName, flow] of Object.entries(flows)) {
    if (flow) {
      const { steps, ...flowConfig } = flow;
      newFlows[flowName] = {
        name: flowName,
        ...flowConfig,
      } as IFlow;

      if (steps) {
        newFlows[flowName].stepsOrder = steps
          .filter((s): s is NonNullable<typeof s> => s != null)
          .map(s => calculateStepId(s))
          .filter((v): v is string => typeof v === 'string');
      }

      const stepsConfig = toObjByKey(
        steps?.filter((s): s is NonNullable<typeof s> => s != null) as Array<Record<string, unknown>>,
        (s) => calculateStepId(s as RecursivePartial<IStepConfiguration>)
      );
      flowSteps = { ...flowSteps, ...stepsConfig };
    }
  }

  return {
    endUserInfo,
    backendConfig,
    flows: newFlows,
    steps: flowSteps,
    general: general || originalConfig.general,
    ...components,
  };
};

/**
 * @description Updates the configuration Svelte store callbacks object of a given flow by name.
 */
export const setFlowCallbacks = async (
  flowName: string,
  callbacks: FlowsEventsConfig
): Promise<void> => {
  return updateConfiguration({
    uiConfig: {
      flows: {
        [flowName]: {
          callbacks,
        },
      },
    },
  });
};
