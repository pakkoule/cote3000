/* Cotation 3000 V9.0.1.2.3 — socle réseau sécurisé / cache / erreurs */
(() => {
  'use strict';
  const memoryCache = new Map();
  const DEFAULT_TIMEOUT = 12000;

  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
  const now = () => Date.now();
  const cacheKey = (namespace,key) => `c3k:v9:${namespace}:${key}`;

  function getLocal(namespace,key,maxAgeMs=0){
    const k=cacheKey(namespace,key);
    const mem=memoryCache.get(k);
    if(mem && (!maxAgeMs || now()-mem.ts<=maxAgeMs)) return mem.value;
    try{
      const raw=localStorage.getItem(k); if(!raw)return null;
      const parsed=JSON.parse(raw);
      if(maxAgeMs && now()-Number(parsed.ts||0)>maxAgeMs){localStorage.removeItem(k);return null;}
      memoryCache.set(k,parsed); return parsed.value;
    }catch{return null;}
  }
  function setLocal(namespace,key,value){
    const k=cacheKey(namespace,key),entry={ts:now(),value}; memoryCache.set(k,entry);
    try{localStorage.setItem(k,JSON.stringify(entry));}catch{}
    return value;
  }
  function removeLocal(namespace,key){const k=cacheKey(namespace,key);memoryCache.delete(k);try{localStorage.removeItem(k);}catch{}}

  async function getAccessToken(){
    const client=window.COTATION3000_SUPABASE;
    if(!client) return '';
    try{const {data}=await client.auth.getSession();return String(data?.session?.access_token||'');}catch{return '';}
  }

  async function request(path,{method='GET',body=null,timeout=DEFAULT_TIMEOUT,auth=true,headers={}}={}){
    const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),timeout);
    try{
      const h={'Accept':'application/json',...headers};
      if(body!==null) h['Content-Type']='application/json';
      if(auth){const token=await getAccessToken();if(!token)throw new Error('Connexion membre requise.');h.Authorization=`Bearer ${token}`;}
      const response=await fetch(path,{method,headers:h,body:body===null?undefined:JSON.stringify(body),signal:controller.signal,credentials:'same-origin'});
      let payload=null; try{payload=await response.json();}catch{}
      if(!response.ok){const error=new Error(payload?.error||payload?.message||`Erreur serveur (${response.status})`);error.status=response.status;error.payload=payload;throw error;}
      return payload;
    }catch(error){
      if(error?.name==='AbortError'){const e=new Error('Le serveur met trop de temps à répondre. Réessaie dans quelques secondes.');e.code='TIMEOUT';throw e;}
      if(error instanceof TypeError && /fetch/i.test(String(error?.message||''))){const e=new Error('Le service serveur est momentanément injoignable.');e.code='NETWORK_ERROR';e.cause=error;throw e;}
      throw error;
    }finally{clearTimeout(timer);}
  }

  function emitError(scope,error,extra={}){
    const detail={scope,message:String(error?.message||error||'Erreur inconnue'),at:new Date().toISOString(),...extra};
    console.error(`Cotation 3000 V9 — ${scope}`,error);
    window.dispatchEvent(new CustomEvent('c3k:v9-error',{detail}));
    return detail;
  }

  window.C3K_V9={
    version:'9.0.1.2.3',request,getAccessToken,sleep,emitError,
    cache:{get:getLocal,set:setLocal,remove:removeLocal}
  };
})();
