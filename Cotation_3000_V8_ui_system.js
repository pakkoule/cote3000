/* Cotation 3000 V8.0.41 — UI system : icônes + espace courant */
(() => {
  'use strict';
  const NS='http://www.w3.org/2000/svg';
  const ICONS={
    user:'<circle cx="12" cy="8" r="3.2"/><path d="M5.5 20c.7-4 3-6 6.5-6s5.8 2 6.5 6"/>',
    bell:'<path d="M6.5 9.8a5.5 5.5 0 0 1 11 0v3.7l1.5 2.3H5l1.5-2.3z"/><path d="M10 19h4"/>',
    flag:'<path d="M5 21V4"/><path d="M5 5h10l-1.4 3L15 11H5"/>',
    history:'<path d="M4.5 8.5A8 8 0 1 1 4 13"/><path d="M4.5 4.5v4h4"/><path d="M12 8v4l2.8 1.8"/>',
    star:'<path d="m12 3 2.7 5.5 6.1.9-4.4 4.3 1 6.1-5.4-2.9-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
    calculator:'<rect x="5" y="3.5" width="14" height="17" rx="2"/><path d="M8 7h8M8 11h2M12 11h2M16 11h.01M8 15h2M12 15h2M16 15h.01M8 18h6"/>',
    book:'<path d="M4 5.5c2.8-.8 5.4-.2 8 1.5v12c-2.6-1.7-5.2-2.3-8-1.5z"/><path d="M20 5.5c-2.8-.8-5.4-.2-8 1.5v12c2.6-1.7 5.2-2.3 8-1.5z"/><path d="M12 7v12"/>',
    sliders:'<path d="M4 7h10M18 7h2M4 12h3M11 12h9M4 17h8M16 17h4"/><circle cx="16" cy="7" r="2"/><circle cx="9" cy="12" r="2"/><circle cx="14" cy="17" r="2"/>',
    map:'<path d="m4 6 5-2 6 2 5-2v14l-5 2-6-2-5 2z"/><path d="M9 4v14M15 6v14"/>',
    fuel:'<path d="M12 2.8c3.2 4.3 5.5 7.3 5.5 10.4A5.5 5.5 0 1 1 6.5 13.2C6.5 10.1 8.8 7.1 12 2.8Z"/><path d="M9.2 14.3c.5 1.7 1.7 2.6 3.4 2.8"/>',
    ship:'<path d="M4 17.5h16M6 17.5 8 8h8l2 9.5M9 8V5h6v3"/><path d="M3 20c1.5 1 3 .9 4.5 0 1.5 1 3 .9 4.5 0 1.5 1 3 .9 4.5 0 1.5 1 3 .9 4.5 0"/>',
    addressbook:'<rect x="6" y="3.5" width="13" height="17" rx="2"/><path d="M6 8H4M6 12H4M6 16H4"/><circle cx="12.5" cy="9" r="2"/><path d="M9.5 16c.5-2.2 1.5-3.3 3-3.3s2.5 1.1 3 3.3"/>',
    customs:'<path d="M6 3.5h9l3 3v14H6z"/><path d="M15 3.5v4h4M9 11h6M9 14h6M9 17h4"/>',
    warning:'<path d="M12 3 21 20H3z"/><path d="M12 9v5M12 17h.01"/>',
    grid:'<rect x="4" y="4" width="6" height="6" rx="1"/><rect x="14" y="4" width="6" height="6" rx="1"/><rect x="4" y="14" width="6" height="6" rx="1"/><rect x="14" y="14" width="6" height="6" rx="1"/>'
  };
  function svg(name,label=''){
    const icon=ICONS[name]||ICONS.grid;
    return `<svg class="c3k-ui-icon" viewBox="0 0 24 24" ${label?`role="img" aria-label="${String(label).replace(/"/g,'&quot;')}"`:'aria-hidden="true"'} focusable="false">${icon}</svg>`;
  }
  function hydrate(root=document){
    root.querySelectorAll?.('[data-c3k-icon]').forEach(node=>{
      const name=node.dataset.c3kIcon||'grid';
      if(node.dataset.c3kIconHydrated===name)return;
      node.innerHTML=svg(name); node.dataset.c3kIconHydrated=name;
    });
  }
  function normalizeToolbar(){
    const map={quoteHistoryButton:'history',favoritesOnlyBtn:'star',toolbarCalculatorsBtn:'calculator',toolbarReferencesBtn:'book',toolbarDisplayBtn:'sliders'};
    Object.entries(map).forEach(([id,name])=>{
      const btn=document.getElementById(id);if(!btn)return;
      const old=btn.querySelector('svg,.c3k-ui-icon,span[aria-hidden="true"]');
      const wrap=document.createElement('span');wrap.setAttribute('data-c3k-icon',name);wrap.setAttribute('aria-hidden','true');wrap.innerHTML=svg(name);wrap.dataset.c3kIconHydrated=name;
      if(old)old.replaceWith(wrap);else btn.insertAdjacentElement('afterbegin',wrap);
    });
  }
  function ensureIndicator(){
    const head=document.querySelector('.top-header');if(!head)return null;
    let el=document.getElementById('c3kSpaceIndicator');
    if(!el){
      el=document.createElement('div');el.id='c3kSpaceIndicator';el.className='c3k-space-indicator';el.setAttribute('aria-live','polite');
      el.innerHTML=`<span data-c3k-space-icon>${svg('map')}</span><span class="c3k-space-indicator-label">Communes · Tronçon</span>`;
      head.appendChild(el);
    }
    return el;
  }
  const visible=el=>!!el && !el.hidden && el.getClientRects().length>0 && getComputedStyle(el).visibility!=='hidden';
  function dialogLabel(){
    const dialogs=[...document.querySelectorAll('[role="dialog"]')].filter(visible);
    const dlg=dialogs.at(-1);if(!dlg)return null;
    const title=dlg.querySelector('h1,h2,h3,[id$="Title"],header strong,.c3k-v8-panel-head strong');
    return title?.textContent?.replace(/\s+/g,' ').trim()||dlg.getAttribute('aria-label')||null;
  }
  function currentSpace(){
    const fuel=document.querySelector('.fuel-reference-modal');
    if(visible(fuel)){
      const archive=document.getElementById('fuelArchivePanel');
      return {label:visible(archive)?'Carburant · Archives & statistiques':'Surcharges carburant',icon:'fuel'};
    }
    const client=document.getElementById('clientDirectoryBackdrop');
    if(visible(client))return {label:'Annuaire clients',icon:'addressbook'};
    const label=dialogLabel();
    if(label){
      const low=label.toLowerCase();
      const icon=low.includes('navire')||low.includes('maritime')?'ship':low.includes('douane')||low.includes('ics')?'customs':low.includes('adr')?'warning':low.includes('annuaire')?'addressbook':low.includes('carburant')?'fuel':'book';
      return {label,icon};
    }
    if(visible(document.getElementById('c3kEuropeGooglePanel')))return {label:'Tronçon Europe · Google Maps',icon:'map'};
    if(document.getElementById('savedModeStack')?.classList.contains('is-active'))return {label:'Communes · Empilement',icon:'map'};
    if(document.getElementById('savedModeTriangle')?.classList.contains('is-active'))return {label:'Communes · Triangulaire',icon:'map'};
    return {label:'Communes · Tronçon',icon:'map'};
  }
  let raf=0,last='';
  function updateSpace(){
    cancelAnimationFrame(raf);raf=requestAnimationFrame(()=>{
      const el=ensureIndicator();if(!el)return;const space=currentSpace();const key=space.icon+'|'+space.label;if(key===last)return;last=key;
      const icon=el.querySelector('[data-c3k-space-icon]'),label=el.querySelector('.c3k-space-indicator-label');if(icon)icon.innerHTML=svg(space.icon);if(label)label.textContent=space.label;el.title=`Espace courant : ${space.label}`;
    });
  }
  function init(){
    ensureIndicator();normalizeToolbar();hydrate();updateSpace();
    const observer=new MutationObserver(muts=>{if(muts.some(m=>m.type==='attributes'||m.addedNodes.length)){hydrate();updateSpace();}});
    observer.observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','class','aria-selected','data-c3k-icon']});
    document.addEventListener('click',()=>setTimeout(updateSpace,0),true);
    window.addEventListener('c3k:account-state',()=>{hydrate();updateSpace()});
    window.C3K_UI={icons:ICONS,svg,hydrate,updateSpace};
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
