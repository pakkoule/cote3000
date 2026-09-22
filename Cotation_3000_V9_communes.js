/* Cotation 3000 V9.0.1 — Communes / Lamy — Shadow Mode */
(() => {
  'use strict';
  const VERSION='9.0.1';
  const CACHE_NS='cities';
  const TTL=5*60*1000;
  const stats={requests:0,ok:0,errors:0,matches:0,mismatches:0,lastMs:null,lastQuery:'',status:'idle'};
  const norm=s=>String(s||'').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[-‐-‒–—_'’.,()]+/g,' ').replace(/\s+/g,' ').trim().replace(/\bsaint\b/g,'st').replace(/\bsainte\b/g,'ste');
  const keyFor=p=>JSON.stringify([p.q||'',p.department||'',p.lamy||'',p.distanceBucket||'',p.limit||100,p.offset||0]);

  async function rpc(params){
    const client=window.COTATION3000_SUPABASE;
    if(!client) throw new Error('Supabase indisponible');
    const started=performance.now();
    const {data,error}=await client.rpc('search_cities',{
      p_query:params.q||'', p_department:params.department||'', p_lamy:params.lamy||'',
      p_distance_bucket:params.distanceBucket||'', p_limit:Math.min(Number(params.limit)||100,200), p_offset:Number(params.offset)||0
    });
    stats.lastMs=Math.round(performance.now()-started);
    if(error) throw error;
    return Array.isArray(data)?data:[];
  }

  async function search(params={}){
    const k=keyFor(params); stats.requests++; stats.lastQuery=params.q||'';
    const cached=window.C3K_V9?.cache?.get(CACHE_NS,k,TTL);
    if(cached){stats.ok++;stats.status='cache';return cached;}
    try{
      const rows=await rpc(params); window.C3K_V9?.cache?.set(CACHE_NS,k,rows); stats.ok++;stats.status='online';return rows;
    }catch(error){stats.errors++;stats.status='error';window.C3K_V9?.emitError?.('cities-search',error,{query:params.q||''});throw error;}
  }

  function distanceBucketFromValue(v){
    if(!v)return '';
    const t=String(v).trim();
    if(['1-135','136-250','251-500','501-750','751-1000','1001+'].includes(t))return t;
    return '';
  }

  async function shadowCompare(localItems,params={}){
    if(!Array.isArray(localItems))return null;
    try{
      const remote=await search({...params,limit:Math.min(200,Math.max(localItems.length,20)),offset:0});
      const a=localItems.slice(0,remote.length).map(x=>`${norm(x.commune)}|${x.departement}|${x.lamy}|${x.distanceNum??x.distance}`);
      const b=remote.map(x=>`${norm(x.commune)}|${x.departement}|${x.lamy}|${x.distance}`);
      const match=a.length===b.length && a.every((v,i)=>v===b[i]);
      if(match)stats.matches++; else stats.mismatches++;
      const detail={match,local:a.length,remote:b.length,query:params.q||'',ms:stats.lastMs};
      window.dispatchEvent(new CustomEvent('c3k:v9-cities-shadow',{detail}));
      return detail;
    }catch{return null;}
  }

  async function status(){
    const client=window.COTATION3000_SUPABASE;if(!client)return null;
    const {data,error}=await client.rpc('cities_v9_status');if(error)throw error;return data;
  }

  window.C3K_V9_CITIES={version:VERSION,search,shadowCompare,status,stats,distanceBucketFromValue};
})();
