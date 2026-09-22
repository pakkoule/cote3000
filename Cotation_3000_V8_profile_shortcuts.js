/* Cotation 3000 V8.0.42 DEV — raccourcis favoris de profil */
(() => {
  'use strict';

  const PREF_FIELD='profile_shortcuts';
  const CACHE_PREFIX='cotation3000.profile.shortcuts.cache.v1.';
  const options=[
    {key:'annuaire',label:'Annuaire clients',targetId:'clientDirectoryBtn',icon:'addressbook'},
    {key:'tva',label:'TVA intracommunautaire',targetId:'vatReferenceBtn',icon:'grid'},
    {key:'carburant',label:'Surcharges carburant',targetId:'fuelReferenceBtn',icon:'fuel'},
    {key:'adr',label:'ADR / IMDG',targetId:'adrReferenceBtn',icon:'warning'},
    {key:'ports-monde',label:'Ports mondiaux',targetId:'worldPortsReferenceBtn',icon:'map'},
    {key:'maritime',label:'Compagnies & navires',targetId:'maritimeCompaniesReferenceBtn',icon:'ship'},
    {key:'douane',label:'Douane / ICS2 / NCTS',targetId:'customsReferenceBtn',icon:'customs'},
    {key:'trm',label:'Référentiel TRM',targetId:'lotiReferenceBtn',icon:'book'},
    {key:'lexique',label:'Lexique transport',targetId:'transportLexiconBtn',icon:'book'},
    {key:'comptes-tva',label:'Comptes TVA',targetId:'accountReferenceBtn',icon:'calculator'},
    {key:'lieux-portuaires',label:'Lieux portuaires',targetId:'portReferenceBtn',icon:'map'},
    {key:'iso-conteneurs',label:'ISO conteneurs',targetId:'isoReferenceBtn',icon:'grid'},
    {key:'attente',label:'Frais d’attente',targetId:'waitingFeeBtn',icon:'history'},
    {key:'stationnement',label:'Stationnement conteneur',targetId:'parkingFeeBtn',icon:'calculator'},
    {key:'poids-attelage',label:'Poids d’attelage',targetId:'towingWeightBtn',icon:'calculator'},
    {key:'historique-cotations',label:'Historique cotations',targetId:'quoteHistoryButton',icon:'history'}
  ];
  const byKey=new Map(options.map(x=>[x.key,x]));
  let activeUserId=null;
  let selected=[];
  let host=null;
  let toolbar=null;
  let resizeObserver=null;

  const cleanValues=value=>{
    let vals=Array.isArray(value)?value:[];
    if(typeof value==='string'){
      try{const parsed=JSON.parse(value);if(Array.isArray(parsed))vals=parsed;}catch{}
    }
    const out=[];
    for(const key of vals){
      const k=String(key||'').trim();
      if(k&&byKey.has(k)&&!out.includes(k))out.push(k);
      if(out.length===3)break;
    }
    return out;
  };
  const cacheKey=uid=>CACHE_PREFIX+uid;
  function setCache(values,uid=activeUserId){
    if(!uid)return;
    selected=cleanValues(values);
    try{localStorage.setItem(cacheKey(uid),JSON.stringify(selected));}catch{}
    render();
  }
  function getCached(uid=activeUserId){
    if(!uid)return [];
    try{return cleanValues(JSON.parse(localStorage.getItem(cacheKey(uid))||'[]'));}catch{return []}
  }
  function iconHtml(item){
    const source=document.getElementById(item.targetId);
    const sourceIcon=source?.querySelector('svg,.vat-eu-home-emblem,[data-c3k-icon]');
    if(sourceIcon){
      let html=sourceIcon.outerHTML;
      if(item.key==='tva')html=html.replaceAll('vatEuMiniStar','vatEuMiniStarShortcut');
      return html;
    }
    if(window.C3K_UI?.svg)return window.C3K_UI.svg(item.icon||'grid');
    return '<span aria-hidden="true">★</span>';
  }
  function ensureHost(){
    toolbar=document.getElementById('compactToolbar');
    if(!toolbar)return null;
    if(!host){
      host=document.createElement('div');
      host.id='c3kProfileShortcuts';
      host.className='c3k-profile-shortcuts';
      host.hidden=true;
      host.setAttribute('aria-label','Raccourcis favoris du profil');
      toolbar.insertAdjacentElement('afterend',host);
      window.addEventListener('resize',position,{passive:true});
      if('ResizeObserver' in window){
        resizeObserver=new ResizeObserver(position);
        resizeObserver.observe(toolbar);
      }
    }
    position();
    return host;
  }
  function position(){
    if(!host||!toolbar)return;
    const parent=toolbar.offsetParent;
    if(!parent)return;
    host.style.width=`${Math.max(1,toolbar.offsetWidth)}px`;
    host.style.top=`${toolbar.offsetTop+toolbar.offsetHeight+7}px`;
    host.style.right=`${Math.max(0,parent.clientWidth-(toolbar.offsetLeft+toolbar.offsetWidth))}px`;
  }
  function launch(key){
    const item=byKey.get(key);if(!item)return;
    const target=document.getElementById(item.targetId);
    if(!target||target.disabled)return;
    target.click();
  }
  function render(){
    const el=ensureHost();if(!el)return;
    const loggedIn=!!activeUserId;
    const rows=selected.map(k=>byKey.get(k)).filter(Boolean);
    if(!loggedIn||!rows.length){el.hidden=true;el.innerHTML='';return;}
    el.hidden=false;
    el.dataset.count=String(rows.length);
    el.innerHTML=rows.map(item=>`<button type="button" class="c3k-profile-shortcut" data-profile-shortcut="${item.key}" title="Accès rapide · ${item.label}" aria-label="Ouvrir ${item.label}"><span class="c3k-profile-shortcut-star" aria-hidden="true">★</span><span class="c3k-profile-shortcut-icon" aria-hidden="true">${iconHtml(item)}</span><span class="c3k-profile-shortcut-label">${item.label}</span></button>`).join('');
    el.querySelectorAll('[data-profile-shortcut]').forEach(btn=>btn.addEventListener('click',()=>launch(btn.dataset.profileShortcut)));
    window.C3K_UI?.hydrate?.(el);
    requestAnimationFrame(position);
  }
  async function loadFromCloud(uid){
    activeUserId=uid||null;
    if(!activeUserId){selected=[];render();return;}
    const cached=getCached(activeUserId);if(cached.length){selected=cached;render();}
    const client=window.COTATION3000_SUPABASE;
    if(!client){render();return;}
    try{
      const {data,error}=await client.from('user_preferences').select('settings').eq('user_id',activeUserId).maybeSingle();
      if(error)throw error;
      const prefs=data?.settings&&typeof data.settings==='object'?data.settings:{};
      selected=cleanValues(prefs[PREF_FIELD]);
      try{localStorage.setItem(cacheKey(activeUserId),JSON.stringify(selected));}catch{}
      render();
    }catch{render();}
  }
  function onAccountState(detail){
    const uid=detail?.session?.user?.id||null;
    if(uid===activeUserId){render();return;}
    loadFromCloud(uid);
  }
  function init(){
    ensureHost();
    const state=window.C3K_ACCOUNT_STATE;
    if(state)onAccountState(state);
    window.addEventListener('c3k:account-state',e=>onAccountState(e.detail));
    window.addEventListener('c3k:profile-shortcuts-changed',e=>{
      const uid=e.detail?.userId||activeUserId;
      if(uid&&uid===activeUserId)setCache(e.detail?.values||[],uid);
    });
    window.addEventListener('c3k:favorites-synced',()=>{if(activeUserId)loadFromCloud(activeUserId)});
  }

  window.C3K_PROFILE_SHORTCUTS={
    field:PREF_FIELD,
    options,
    cleanValues,
    setCache,
    getSelected:()=>selected.slice(),
    refresh:()=>activeUserId?loadFromCloud(activeUserId):render()
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
