/**
 * Query parameter configuration schema
 */
interface QueryParamsConfig {
  flowName?: string;
  clientId?: string;
  id?: string;
  token?: string;
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  language?: string;
  type?: string;
}

/**
 * Type guard to check if a key is a valid QueryParamsConfig key
 */
function isValidConfigKey(key: string): key is keyof QueryParamsConfig {
  const validKeys: Array<keyof QueryParamsConfig> = [
    'flowName', 'clientId', 'id', 'token', 'firstName',
    'lastName', 'phone', 'email', 'language', 'type'
  ];
  return validKeys.includes(key as keyof QueryParamsConfig);
}

/**
 * @description Gets config specific query params as an object - see -docs url here-
 */
export const getConfigFromQueryParams = (): QueryParamsConfig => {
  // Make sure non-unrelated query params are passed to the config
  const {
    b_uid,
    b_cid,
    b_t,
    b_fn,
    b_ln,
    b_fid,
    b_ph,
    b_em,
    b_lang,
    b_eut,
    // /?b_uid=&b_cid= --> { b_uid: '', b_cid: '' };
  } = Object.fromEntries(new URLSearchParams(window.location.search));

  const queryParamsMapping: Record<string, string | undefined> = {
    flowName: b_fid,
    clientId: b_cid,
    id: b_uid,
    token: b_t,
    firstName: b_fn,
    lastName: b_ln,
    phone: b_ph,
    email: b_em,
    language: b_lang,
    type: b_eut,
  };

  // Make sure no empty strings are passed to the config
  const result: QueryParamsConfig = {};

  for (const [key, value] of Object.entries(queryParamsMapping)) {
    if (value && isValidConfigKey(key)) {
      result[key] = value;
    }
  }

  return result;
};
