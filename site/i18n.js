import chinese from './locales/zh-CN.js?v=three-versions-20261015';

const canonical=value=>Intl.getCanonicalLocales(value)[0];

// Locale changes are explicit. No browser, IP, URL, or saved-preference detection.
export function createI18n({catalogs=[chinese],fallbackLocale='zh-CN',locale=fallbackLocale}={}){
  const registered=new Map(),listeners=new Set();
  const fallback=canonical(fallbackLocale);
  function registerLocale(catalog){
    const name=canonical(catalog.locale),direction=catalog.direction||'ltr';
    if(!name||!['ltr','rtl'].includes(direction)||!catalog.messages||typeof catalog.messages!=='object'||Array.isArray(catalog.messages))throw new Error('Invalid locale catalog');
    const messages=Object.create(null);
    for(const [key,value] of Object.entries(catalog.messages)){if(typeof value!=='string')throw new Error('Locale messages must be strings');messages[key]=value;}
    registered.set(name,Object.freeze({direction,messages:Object.freeze(messages)}));return name;
  }
  catalogs.forEach(registerLocale);
  if(!registered.has(fallback))throw new Error('Missing fallback locale');
  let current=registered.has(canonical(locale))?canonical(locale):fallback;
  function t(key,values={},defaultValue){
    const primary=registered.get(current).messages,backup=registered.get(fallback).messages;
    const message=Object.hasOwn(primary,key)?primary[key]:Object.hasOwn(backup,key)?backup[key]:defaultValue??key;
    return String(message).replace(/\{([a-zA-Z0-9_]+)\}/g,(match,name)=>Object.hasOwn(values,name)?String(values[name]):match);
  }
  function setLocale(value){
    const requested=canonical(value),next=registered.has(requested)?requested:fallback;
    if(next!==current){current=next;for(const listener of listeners)listener(current);}
    return {locale:current,available:registered.has(requested)};
  }
  return Object.freeze({
    get locale(){return current;},get direction(){return registered.get(current).direction;},
    get availableLocales(){return Object.freeze([...registered.keys()]);},
    t,registerLocale,setLocale,
    subscribe(listener){listeners.add(listener);return()=>listeners.delete(listener);},
    formatNumber(value,options={}){return new Intl.NumberFormat(current,options).format(value);},
    formatMoney(minor,currency){const formatter=new Intl.NumberFormat(current,{style:'currency',currency:currency.toUpperCase()});return formatter.format(minor/10**formatter.resolvedOptions().maximumFractionDigits);},
  });
}

export const i18n=createI18n();

export function applyTranslations(root=document,translator=i18n){
  const attributes={
    'data-i18n-aria-label':'aria-label','data-i18n-title':'title',
    'data-i18n-placeholder':'placeholder','data-i18n-content':'content',
  };
  const selector=['[data-i18n]',...Object.keys(attributes).map(name=>`[${name}]`)].join(',');
  const nodes=[...(root.matches?.(selector)?[root]:[]),...root.querySelectorAll(selector)];
  for(const element of nodes){
    const key=element.getAttribute('data-i18n');
    if(key)element.textContent=translator.t(key,{},element.textContent);
    for(const [marker,attribute] of Object.entries(attributes)){
      const attributeKey=element.getAttribute(marker);
      if(attributeKey)element.setAttribute(attribute,translator.t(attributeKey,{},element.getAttribute(attribute)||''));
    }
  }
}
