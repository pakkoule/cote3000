/* Cotation 3000 V8.0.27 — couche d'édition de tous les référentiels + communes */
(() => {
  'use strict';
  const REF_TABLE='reference_overrides';
  const MEDIA_BUCKET='c3k-reference-media';
  const SUPABASE_URL='https://mhnujvgzoozimtbrasuh.supabase.co';
  const SUPABASE_KEY='sb_publishable_qHIOczDD3MZoa25VO1HVAg_JOhuDUGD';
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const clone=v=>JSON.parse(JSON.stringify(v??null));
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  let client=null, role='guest', profile=null, loaded=false, overrides=new Map();

  const definitions={
    adr:{label:'ADR / IMDG',registry:()=>window.C3K_ADR_REFERENCE,collections:{un:{label:'Entrées UN',key:r=>`UN${String(Number(r.un)||0).padStart(4,'0')}`,identity:['un']}}},
    ports_world:{label:'Ports mondiaux SMDG',registry:()=>window.C3K_WORLD_PORTS_REFERENCE,collections:{ports:{label:'Ports',key:r=>String(r.unlocode||''),identity:['unlocode']},terminals:{label:'Terminaux',key:r=>String(r.key||''),identity:['key']},operators:{label:'Opérateurs',key:r=>String(r.name||''),identity:['name']}}},
    maritime:{label:'Compagnies maritimes',registry:()=>window.C3K_MARITIME_REFERENCE,collections:{entities:{label:'Groupes / filiales',key:r=>String(r.entityId||r.groupId||''),identity:['entityId','groupId'],media:true},vessels:{label:'Navires',key:r=>String(r.imo||`${r.vessel||'NAVIRE'}|${r.callDate||r.year||''}`),identity:['imo']}}},
    customs:{label:'Douane / ICS2 / NCTS',registry:()=>window.C3K_CUSTOMS_REFERENCE,collections:{fiches:{label:'Fiches métier',key:r=>String(r.id||''),identity:['id']},ics2:{label:'ICS2',key:r=>String(r.id||''),identity:['id']},ncts:{label:'NCTS / DELTA T',key:r=>String(r.id||''),identity:['id']},countries:{label:'Pays CTC',key:r=>String(r.country||''),identity:['country']},scenarios:{label:'Scénarios',key:r=>String(r.id||''),identity:['id']},acronyms:{label:'Acronymes',key:r=>String(r.acronym||''),identity:['acronym']},regimes:{label:'Régimes',key:r=>String(r.code||''),identity:['code']},decision:{label:'Arbre décision',key:r=>String(r.step??''),identity:['step']},searchExamples:{label:'Recherche guidée',key:r=>String(r.query||''),identity:['query']}}},
    iso:{label:'ISO des conteneurs',registry:()=>window.C3K_LEGACY_REFERENCES?.iso,collections:{items:{label:'Codes ISO',key:r=>String(r.code||''),identity:['code']}}},
    vat:{label:'TVA intracommunautaire',registry:()=>window.C3K_LEGACY_REFERENCES?.vat,collections:{countries:{label:'Pays / ports',key:r=>String(r.vatKey??''),identity:['vatKey'],allowAdd:true,allowDelete:false}}},
    fuel:{label:'Surcharges carburant',registry:()=>window.C3K_LEGACY_REFERENCES?.fuel,collections:{rates:{label:'Taux mensuels',key:r=>String(r._key||`${r.monthKey||''}|${r.fuel||''}`),identity:['monthKey','fuel'],allowAdd:false,allowDelete:false},clients:{label:'Lignes clients',key:r=>String(r._key||''),identity:[],newKeyPrefix:'fuel-client'}}},
    loti:{label:'TRM pratique / LOTI',registry:()=>window.C3K_LEGACY_REFERENCES?.loti,collections:{items:{label:'Fiches réglementaires',key:r=>String(r.id||''),identity:['id']}}},
    lexicon:{label:'Lexique transport',registry:()=>window.C3K_LEGACY_REFERENCES?.lexicon,collections:{items:{label:'Entrées du lexique',key:r=>String(r.id||''),identity:['id']}}},
    accounts:{label:'Comptes TVA',registry:()=>window.C3K_LEGACY_REFERENCES?.accounts,collections:{items:{label:'Comptes',key:r=>String(r._key||''),identity:[],newKeyPrefix:'account'}}},
    port_places:{label:'Lieux portuaires',registry:()=>window.C3K_LEGACY_REFERENCES?.port_places,collections:{items:{label:'Installations',key:r=>String(r.id||''),identity:['id']}}},
    communes:{label:'Base des villes',registry:()=>window.C3K_LEGACY_REFERENCES?.communes,collections:{items:{label:'Communes',key:r=>String(r._key||''),identity:[],newKeyPrefix:'city',allowDelete:false}}}
  };
  const labels={un:'Numéro UN',name:'Nom / désignation',class:'Classe',ge:'Groupe emballage',sector:'Secteur',keywords:'Mots-clés',mode:'Mode / contrôle',priority:'Priorité',variable:'Variable',status:'Statut',source:'Source',unlocode:'UNLOCODE',iso2:'ISO2',country:'Pays',location:'Localité',terminalCount:'Nombre de terminaux',altUnlocodes:'UNLOCODE alternatifs',terminalCodes:'Codes terminaux',terminals:'Terminaux',operators:'Opérateurs',lat:'Latitude',lon:'Longitude',addresses:'Adresses',websites:'Sites web',key:'Clé',code:'Code',operator:'Opérateur',website:'Site web',address:'Adresse',remarks:'Remarques',aliases:'Alias',groupId:'ID groupe',entityId:'ID entité',level:'Niveau',entity:'Entité',parent:'Maison mère',relation:'Relation',status2026:'Statut 2026',europeStatus:'Statut Europe',parentCountry:'Pays / siège parent',parentProfile:'Profil parent',subsidiaryCount:'Nombre de filiales',leHavreVesselCount:'Navires Le Havre',leHavrePresence:'Présence Le Havre',coverage:'Couverture',inV4:'Présent V4',logoUrl:'Logo personnalisé',operatingEntity:'Entité opératrice',attachmentRule:'Règle de rattachement',sourceGroup:'Groupe source',companyBrandService:'Compagnie / marque / service',vessel:'Navire',imo:'IMO',callDate:'Date escale',year:'Année',service:'Service / rotation',terminal:'Terminal / zone',notes:'Notes',id:'ID',domain:'Domaine',subdomain:'Sous-domaine',term:'Terme',definition:'Définition',use:'Quand l’utiliser',actor:'Acteur',system:'Système / outil',flow:'Flux',goodsStatus:'Statut marchandise',jurisdiction:'Juridiction',data:'Données / documents',rule:'Règle / délai',relations:'Relations',sourceIds:'IDs sources',sourceUrls:'URLs sources',note:'Note Cotation 3000',case:'Cas',responsible:'Responsable',formality:'Formalité',deadline:'Délai',phase:'Phase',response:'Réponse douane',next:'Suite opérationnelle',basis:'Base / règle',step:'Étape',action:'Action',risk:'Risque',category:'Catégorie',procedure:'Procédure',active:'Actif',chain:'Chaîne',actors:'Acteurs',systems:'Systèmes',attention:'Attention',links:'Fiches liées',acronym:'Acronyme',expanded:'Développé',label:'Libellé',usage:'Usage',question:'Question',yes:'Oui',no:'Non',query:'Recherche',expected:'Résultat attendu',sizeClass:'Classe de taille',dimensions:'Dimensions extérieures',description:'Description technique',option:'Option / variante',tareAvgKg:'Tare moyenne (kg)',vatKey:'Index pays',scope:'Périmètre TVA',alpha2:'ISO alpha-2',alpha3:'ISO alpha-3',numeric:'ISO numérique',ports:'Ports / villes',monthKey:'Mois (AAAA-MM)',month:'Libellé du mois',fuel:'Énergie',normal:'Taux normal',reduced:'Taux réduit',traffic:'Trafic',location:'Lieu',rate:'Taux (%)',reference:'Article / référence',title:'Titre',section:'Section',summary:'Résumé',warning:'Avertissement',related:'Références / renvois',toolLabel:'Outil Cotation 3000',toolTarget:'ID outil',page:'Page source',sources:'Sources',synonyms:'Synonymes',abbreviations:'Abréviations',english:'Anglais',code_tva:'Code TVA',account:'Compte',tax_label:'Libellé TVA',basin:'Ville / bassin',type:'Type',verifiedOn:'Vérifié le',legacyIds:'IDs historiques',siteRef:'Référence site',area:'Surface',capacity:'Capacité',commune:'Commune',departement:'Département',lamy:'Zone Lamy',distance:'Distance depuis Le Havre (km)'};
  const hiddenFields=new Set(['search','normalized','terminalKeys','c3kKey','distanceColor']);
  const isHiddenField=k=>hiddenFields.has(k)||String(k).startsWith('_');
  const longField=k=>['definition','use','data','rule','notes','remarks','keywords','relations','attention','expected','chain','coverage','parentProfile','sourceUrls','sourceIds','addresses','websites','terminals','operators','search'].includes(k);
  const keyOf=(ref,collection,row)=>definitions[ref]?.collections?.[collection]?.key(row)||'';
  const mapKey=(ref,col,key)=>`${ref}\u001f${col}\u001f${key}`;
  const registryArray=(ref,col)=>{const reg=definitions[ref]?.registry?.();return Array.isArray(reg?.[col])?reg[col]:null;};
  const canEdit=()=>['admin','superadmin'].includes(role);
  const isSuper=()=>role==='superadmin';

  function currentItem(ref,col,key){const arr=registryArray(ref,col)||[];return arr.find(r=>keyOf(ref,col,r)===key)||null;}
  function refreshAll(refs=null){
    const list=refs==null?null:(Array.isArray(refs)?refs:[refs]);
    if(list){for(const ref of list)window.C3K_LEGACY_REFERENCE_SYNC?.(ref);}
    else window.C3K_LEGACY_REFERENCE_SYNC?.();
    window.C3K_ADR_REFERENCE_UI?.render?.();window.C3K_WORLD_PORTS_REFERENCE_UI?.render?.();window.C3K_MARITIME_REFERENCE_UI?.render?.();window.C3K_CUSTOMS_REFERENCE_UI?.render?.();
    window.dispatchEvent(new CustomEvent('c3k:reference-data-changed'));
    const u=document.getElementById('universalSearchInput');if(u?.value)u.dispatchEvent(new Event('input',{bubbles:true}));
    setTimeout(()=>bind(document),0);
  }
  function applyOverride(row){
    const def=definitions[row.reference_key],colDef=def?.collections?.[row.collection_key],arr=registryArray(row.reference_key,row.collection_key);if(!colDef||!arr)return;
    const idx=arr.findIndex(x=>colDef.key(x)===row.entity_key);
    if(row.is_deleted){if(idx>=0)arr.splice(idx,1);return;}
    if(idx>=0){Object.keys(arr[idx]).forEach(k=>{if(!(k in (row.data||{})))delete arr[idx][k];});Object.assign(arr[idx],clone(row.data||{}));}
    else arr.push(clone(row.data||{}));
  }
  async function loadOverrides(){
    if(!client)return;const {data,error}=await client.from(REF_TABLE).select('*').order('updated_at',{ascending:true});if(error){console.warn('C3K reference overrides',error);return;}
    overrides.clear();const touched=new Set();for(const row of data||[]){overrides.set(mapKey(row.reference_key,row.collection_key,row.entity_key),row);applyOverride(row);touched.add(row.reference_key);}loaded=true;refreshAll([...touched]);
  }
  async function resolveRole(){
    if(window.C3K_ACCOUNT_STATE?.profile){profile=window.C3K_ACCOUNT_STATE.profile;role=profile.role||'guest';return;}
    const {data:{session}}=await client.auth.getSession();if(!session?.user){role='guest';profile=null;return;}
    const {data}=await client.from('profiles').select('id,role,username,first_name').eq('id',session.user.id).maybeSingle();profile=data;role=data?.role||'user';
  }

  function cleanupEditButtons(root=document){
    // V8.0.27 — un bouton d'action ne doit jamais être pris pour une entrée éditable.
    // Nettoie aussi les duplications imbriquées créées par les versions 8.0.20/8.0.21.
    root.querySelectorAll?.('.c3k-ref-edit-btn .c3k-ref-edit-btn').forEach(btn=>btn.remove());
    root.querySelectorAll?.('.c3k-ref-edit-btn[data-c3k-ref],.c3k-ref-edit-btn[data-c3k-collection],.c3k-ref-edit-btn[data-c3k-key]').forEach(btn=>{
      delete btn.dataset.c3kRef; delete btn.dataset.c3kCollection; delete btn.dataset.c3kKey;
    });
  }
  function bind(root=document){
    injectAddButtons();
    cleanupEditButtons(root);
    root.querySelectorAll?.('[data-c3k-ref][data-c3k-collection][data-c3k-key]:not(.c3k-ref-edit-btn)').forEach(card=>{
      const ref=card.dataset.c3kRef,col=card.dataset.c3kCollection,key=card.dataset.c3kKey;
      if(!definitions[ref]?.collections?.[col]||!key)return;
      const host=card.tagName==='TR'?(card.lastElementChild||card):card;
      card.classList.add('c3k-ref-editable');host.classList.add('c3k-ref-edit-host');
      card.classList.toggle('c3k-ref-overridden',overrides.has(mapKey(ref,col,key)));host.classList.toggle('c3k-ref-overridden-host',overrides.has(mapKey(ref,col,key)));
      const direct=[...host.children].filter(node=>node.classList?.contains('c3k-ref-edit-btn'));
      let btn=direct[0]||null;
      direct.slice(1).forEach(extra=>extra.remove());
      if(!canEdit()){btn?.remove();return;}
      if(!btn){btn=document.createElement('button');btn.type='button';btn.className='c3k-ref-edit-btn';btn.textContent='⚙';host.appendChild(btn);}
      btn.dataset.c3kEditRef=ref;btn.dataset.c3kEditCollection=col;btn.dataset.c3kEditKey=key;
      btn.setAttribute('aria-label',`Modifier ${definitions[ref].label}`);
      btn.title='Modifier';
    });
  }
  function currentCollection(ref){
    if(ref==='adr')return'un';
    if(ref==='ports_world')return document.querySelector('[data-world-tab].is-active')?.dataset.worldTab||'ports';
    if(ref==='maritime'){const t=document.querySelector('[data-maritime-tab].is-active')?.dataset.maritimeTab||'groups';return t==='vessels'?'vessels':'entities';}
    if(ref==='customs')return document.querySelector('[data-customs-tab].is-active')?.dataset.customsTab||'fiches';
    if(ref==='iso')return'items'; if(ref==='vat')return'countries'; if(ref==='fuel')return'clients'; if(ref==='loti')return'items'; if(ref==='lexicon')return'items'; if(ref==='accounts')return'items'; if(ref==='port_places')return'items'; if(ref==='communes')return'items';
    return'';
  }
  function ensureCommunesAddButton(){
    const host=document.getElementById('pagination');
    if(!host)return;
    host.classList.add('c3k-commune-pagination-host');
    let btn=host.querySelector('.c3k-commune-add-btn');
    if(!isSuper()){btn?.remove();return;}
    if(!btn){
      btn=document.createElement('button');
      btn.type='button';
      btn.className='c3k-commune-add-btn';
      btn.textContent='+';
      btn.title='Ajouter une ville';
      btn.setAttribute('aria-label','Ajouter une ville');
      btn.addEventListener('click',()=>openEditor('communes','items','',true));
      host.appendChild(btn);
    }
  }
  function findExistingCommuneByNameDept(commune,departement,excludeKey=''){
    const rows=window.C3K_COMMUNES_EDITOR_BRIDGE?.list?.()||[];
    const targetName=norm(String(commune||'').toUpperCase());
    const targetDept=String(departement||'').trim();
    return rows.find(row=>String(row?._key||'')!==String(excludeKey||'')&&norm(String(row?.commune||'').toUpperCase())===targetName&&String(row?.departement||'').trim()===targetDept)||null;
  }
  function resolveLamyDistanceData(lamy){
    const zone=String(lamy||'').trim();
    if(!zone)return null;
    const rows=window.C3K_COMMUNES_EDITOR_BRIDGE?.list?.()||[];
    const matches=rows.filter(row=>String(row?.lamy||'').trim()===zone);
    if(!matches.length)return null;
    const distances=[...new Set(matches.map(row=>Number(row?.distance)).filter(Number.isFinite))];
    if(!distances.length)return null;
    // La matrice Cotation 3000 associe une distance unique à chaque zone Lamy.
    // Si une anomalie future introduit plusieurs valeurs, on retient la valeur majoritaire.
    let distance=distances[0];
    if(distances.length>1){
      const counts=new Map();for(const row of matches){const d=Number(row?.distance);if(Number.isFinite(d))counts.set(d,(counts.get(d)||0)+1);}
      distance=[...counts.entries()].sort((a,b)=>b[1]-a[1])[0]?.[0]??distance;
    }
    const color=String(matches.find(row=>Number(row?.distance)===distance)?.distanceColor||'');
    return {distance,distanceColor:color,zone};
  }
  function injectAddButtons(){
    const configs=[['adr','#adrReferenceModal .adr-reference-head'],['ports_world','#worldPortsModal .world-ports-head'],['maritime','#maritimeReferenceModal .maritime-reference-head'],['customs','#customsReferenceModal .customs-reference-head'],['iso','#isoReferenceModal .iso-reference-head'],['vat','#vatReferenceModal .vat-reference-head'],['fuel','#fuelReferenceModal .fuel-reference-head'],['loti','#lotiReferenceModal .loti-reference-head'],['lexicon','#transportLexiconModal .transport-lexicon-head'],['accounts','#accountReferenceModal .account-reference-head'],['port_places','#portReferenceModal .port-reference-head']];
    for(const [ref,sel] of configs){const head=document.querySelector(sel);if(!head)continue;const col=currentCollection(ref),colDef=definitions[ref]?.collections?.[col];let btn=head.querySelector('.c3k-ref-add-btn');if(!isSuper()||colDef?.allowAdd===false){btn?.remove();continue;}if(!btn){btn=document.createElement('button');btn.type='button';btn.className='c3k-ref-add-btn';btn.textContent=ref==='fuel'?'＋ Client':'＋ Ajouter';btn.addEventListener('click',()=>openEditor(ref,currentCollection(ref),'',true));head.insertBefore(btn,head.lastElementChild);}}
    ensureCommunesAddButton();
  }

  function templateFor(ref,col){
    const arr=registryArray(ref,col)||[];const sample=arr[0]||{};const out={};for(const [k,v] of Object.entries(sample)){out[k]=isHiddenField(k)?(k==='_key'?'':clone(v)):(Array.isArray(v)?[]:v&&typeof v==='object'?{}:typeof v==='number'?0:typeof v==='boolean'?false:'');}
    const colDef=definitions[ref]?.collections?.[col];if(colDef?.newKeyPrefix)out._key=`${colDef.newKeyPrefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`;
    if(ref==='maritime'&&col==='entities'&&!('logoUrl'in out))out.logoUrl='';
    if(ref==='lexicon'&&col==='items'){
      const max=Math.max(0,...arr.map(r=>Number(String(r.id||'').match(/^LEX-(\d+)$/)?.[1]||0)));
      out.id=`LEX-${String(max+1).padStart(4,'0')}`;
    }
    if(ref==='loti'&&col==='items'){
      const used=new Set(arr.map(r=>String(r.id||'')));let n=1,id='';do{id=`TRM-V7-CUSTOM-${String(n++).padStart(3,'0')}`}while(used.has(id));out.id=id;
    }
    if(ref==='vat'&&col==='countries'){
      out.vatKey=Math.max(-1,...arr.map(r=>Number(r.vatKey)).filter(Number.isFinite))+1;
      out.country='';out.scope='INTRACOM';out.alpha2='';out.alpha3='';out.numeric='';out.ports=[];
    }
    if(ref==='communes'&&col==='items'){
      out.commune='';out.departement=window.C3K_COMMUNES_EDITOR_BRIDGE?.departments?.()?.[0]||'';out.lamy=window.C3K_COMMUNES_EDITOR_BRIDGE?.lamyZones?.()?.[0]||'';out.distance=0;out.distanceColor='';
    }
    return out;
  }
  function fieldMarkup(k,v,disabled,ref,col){
    const label=labels[k]||k;const dis=disabled?' disabled':'';
    if(ref==='vat'&&k==='scope'){
      const val=String(v||'INTRACOM');return `<label class="c3k-ref-editor-field"><span>${esc(label)}</span><select name="${esc(k)}"${dis}><option value="INTRACOM"${val==='INTRACOM'?' selected':''}>INTRACOM</option><option value="HORS INTRACOM"${val==='HORS INTRACOM'?' selected':''}>HORS INTRACOM</option></select></label>`;
    }
    if(ref==='communes'&&k==='departement'){
      const opts=(window.C3K_COMMUNES_EDITOR_BRIDGE?.departments?.()||[]).map(x=>`<option value="${esc(x)}"${String(x)===String(v)?' selected':''}>${esc(x)}</option>`).join('');
      return `<label class="c3k-ref-editor-field"><span>${esc(label)}</span><select name="${esc(k)}"${dis}>${opts}</select></label>`;
    }
    if(ref==='communes'&&k==='lamy'){
      const opts=(window.C3K_COMMUNES_EDITOR_BRIDGE?.lamyZones?.()||[]).map(x=>`<option value="${esc(x)}"${String(x)===String(v)?' selected':''}>${esc(x)}</option>`).join('');
      return `<label class="c3k-ref-editor-field"><span>${esc(label)}</span><select name="${esc(k)}"${dis}>${opts}</select></label>`;
    }
    if(typeof v==='boolean')return `<label class="c3k-ref-editor-field"><span>${esc(label)}</span><select name="${esc(k)}"${dis}><option value="false" ${!v?'selected':''}>Non</option><option value="true" ${v?'selected':''}>Oui</option></select></label>`;
    if(typeof v==='number')return `<label class="c3k-ref-editor-field"><span>${esc(label)}</span><input type="number" step="any" name="${esc(k)}" value="${esc(v)}"${dis}></label>`;
    if(Array.isArray(v)||v&&typeof v==='object'){const txt=JSON.stringify(v,null,2);return `<label class="c3k-ref-editor-field is-wide"><span>${esc(label)} · JSON</span><textarea name="${esc(k)}"${dis}>${esc(txt)}</textarea></label>`;}
    const val=String(v??'');if(longField(k)||val.length>120)return `<label class="c3k-ref-editor-field is-wide"><span>${esc(label)}</span><textarea name="${esc(k)}"${dis}>${esc(val)}</textarea></label>`;
    return `<label class="c3k-ref-editor-field"><span>${esc(label)}</span><input name="${esc(k)}" value="${esc(val)}"${dis}></label>`;
  }
  function ensureModal(){
    if(document.getElementById('c3kReferenceEditorBackdrop'))return;
    document.body.insertAdjacentHTML('beforeend',`<div class="c3k-ref-editor-backdrop" id="c3kReferenceEditorBackdrop" hidden><section class="c3k-ref-editor" role="dialog" aria-modal="true" aria-labelledby="c3kReferenceEditorTitle"><header class="c3k-ref-editor-head"><div><h3 id="c3kReferenceEditorTitle">Modifier le référentiel</h3><small id="c3kReferenceEditorSub"></small></div><button class="c3k-ref-editor-close" id="c3kReferenceEditorClose" type="button" aria-label="Fermer">×</button></header><form id="c3kReferenceEditorForm"><div class="c3k-ref-editor-body"><p class="c3k-ref-editor-hint">Les modifications sont enregistrées dans Supabase et deviennent prioritaires sur le fichier source GitHub. L’historique est conservé dans le registre administrateur.</p><div class="c3k-ref-editor-grid" id="c3kReferenceEditorFields"></div></div><div class="c3k-ref-editor-status" id="c3kReferenceEditorStatus" hidden></div><footer class="c3k-ref-editor-actions"><button class="c3k-ref-delete" id="c3kReferenceEditorDelete" type="button" hidden>Supprimer</button><button class="c3k-ref-reset" id="c3kReferenceEditorReset" type="button" hidden>Revenir à la source</button><span class="spacer"></span><button class="c3k-ref-cancel" id="c3kReferenceEditorCancel" type="button">Annuler</button><button class="c3k-ref-save" type="submit">💾 Enregistrer les modifications</button></footer></form></section></div>`);
    const close=()=>document.getElementById('c3kReferenceEditorBackdrop').hidden=true;
    document.getElementById('c3kReferenceEditorClose').onclick=close;document.getElementById('c3kReferenceEditorCancel').onclick=close;document.getElementById('c3kReferenceEditorBackdrop').addEventListener('pointerdown',e=>{if(e.target.id==='c3kReferenceEditorBackdrop')close();});
  }
  const status=(msg,type='')=>{const n=document.getElementById('c3kReferenceEditorStatus');n.hidden=false;n.className='c3k-ref-editor-status'+(type?` is-${type}`:'');n.textContent=msg;};
  function openEditor(ref,col,key,isNew){
    if(!canEdit()||!definitions[ref]?.collections?.[col])return;ensureModal();const arr=registryArray(ref,col)||[];const item=isNew?templateFor(ref,col):currentItem(ref,col,key);if(!item)return;
    const def=definitions[ref],colDef=def.collections[col],stored=overrides.get(mapKey(ref,col,key));const fields=document.getElementById('c3kReferenceEditorFields');
    document.getElementById('c3kReferenceEditorTitle').textContent=isNew?(ref==='communes'?'Ajouter une ville':'Ajouter une entrée'):'Modifier l’entrée';document.getElementById('c3kReferenceEditorSub').textContent=`${def.label} · ${colDef.label}${key?' · '+key:''}`;
    const visibleEntries=(ref==='communes'&&isNew)?Object.entries(item).filter(([k])=>['commune','departement','lamy'].includes(k)):Object.entries(item).filter(([k])=>!isHiddenField(k));
    fields.innerHTML=visibleEntries.map(([k,v])=>fieldMarkup(k,v,!isNew&&colDef.identity.includes(k),ref,col)).join('');
    if(ref==='communes'&&isNew){fields.insertAdjacentHTML('afterbegin',`<p class="c3k-ref-editor-hint c3k-commune-add-hint">Mode simple : renseigne le <strong>nom</strong>, le <strong>département</strong> et la <strong>zone Lamy</strong>. La distance est calculée automatiquement depuis la zone Lamy selon la matrice Cotation 3000 au moment de l’enregistrement.</p>`);}
    if(ref==='maritime'&&col==='entities')fields.insertAdjacentHTML('beforeend',`<div class="c3k-ref-media-box"><div class="c3k-ref-media-preview" id="c3kRefMediaPreview">${item.logoUrl?`<img src="${esc(item.logoUrl)}" alt="Logo">`:'LOGO'}</div><div class="c3k-ref-media-copy"><strong>Logo compagnie</strong><input id="c3kRefMediaFile" type="file" accept="image/png,image/jpeg,image/webp"><small>PNG, JPG ou WebP · 2 Mo maximum. Un nouveau logo devient prioritaire partout dans Cotation 3000.</small></div></div>`);
    const form=document.getElementById('c3kReferenceEditorForm');form.dataset.ref=ref;form.dataset.collection=col;form.dataset.key=key;form.dataset.new=isNew?'1':'0';form.dataset.base=JSON.stringify(stored?.base_snapshot??(!isNew?item:null));
    const del=document.getElementById('c3kReferenceEditorDelete'),reset=document.getElementById('c3kReferenceEditorReset');del.hidden=!isSuper()||isNew||colDef.allowDelete===false;reset.hidden=!isSuper()||isNew||!stored;
    del.onclick=()=>deleteEntry(ref,col,key);reset.onclick=()=>resetEntry(ref,col,key);form.onsubmit=saveForm;document.getElementById('c3kReferenceEditorStatus').hidden=true;document.getElementById('c3kReferenceEditorBackdrop').hidden=false;
    document.getElementById('c3kRefMediaFile')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(f){const url=URL.createObjectURL(f);document.getElementById('c3kRefMediaPreview').innerHTML=`<img src="${esc(url)}" alt="Aperçu">`;}});
  }
  function parseForm(form,template){
    const fd=new FormData(form),out={};for(const [k,v] of Object.entries(template)){if(isHiddenField(k)){out[k]=v;continue;}const raw=fd.get(k);if(raw===null){out[k]=v;continue;}if(typeof v==='number')out[k]=raw===''?0:Number(raw);else if(typeof v==='boolean')out[k]=raw==='true';else if(Array.isArray(v)||v&&typeof v==='object'){try{out[k]=JSON.parse(String(raw||'null'))}catch{throw new Error(`JSON invalide dans ${labels[k]||k}`)}}else out[k]=String(raw);}
    return out;
  }
  async function uploadMedia(ref,col,key,file){
    if(!file)return'';if(file.size>2097152)throw new Error('Le fichier dépasse 2 Mo.');if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Format logo non autorisé.');const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';const safe=String(key||'logo').replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'').toLowerCase();const path=`${ref}/${col}/${safe}-${Date.now()}.${ext}`;const {error}=await client.storage.from(MEDIA_BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});if(error)throw error;return client.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl||'';
  }
  async function saveForm(e){
    e.preventDefault();if(!canEdit())return;const form=e.currentTarget,ref=form.dataset.ref,col=form.dataset.collection,isNew=form.dataset.new==='1',oldKey=form.dataset.key||'';const current=isNew?templateFor(ref,col):currentItem(ref,col,oldKey);if(!current)return;
    try{status('Enregistrement…');const data=parseForm(form,current);
      if(ref==='communes'){
        data.commune=String(data.commune||'').trim().toUpperCase();
        data.departement=String(data.departement||'').trim();
        data.lamy=String(data.lamy||'').trim();
        if(!data.commune)throw new Error('Le nom de la commune est obligatoire.');
        if(!data.departement)throw new Error('Le département est obligatoire.');
        if(!data.lamy)throw new Error('La zone Lamy est obligatoire.');
        const duplicate=findExistingCommuneByNameDept(data.commune,data.departement,oldKey);
        if(isNew&&duplicate)throw new Error('Cette commune existe déjà dans la base. Utilise le bouton ⚙ pour la modifier.');
        const resolved=resolveLamyDistanceData(data.lamy);
        if(resolved){data.distance=resolved.distance;data.distanceColor=resolved.distanceColor||data.distanceColor||'';}
        else if(isNew){throw new Error(`Aucune distance n’est définie dans la matrice pour la zone Lamy ${data.lamy}.`);}
      }
      const file=document.getElementById('c3kRefMediaFile')?.files?.[0];if(file)data.logoUrl=await uploadMedia(ref,col,oldKey||keyOf(ref,col,data),file);const newKey=keyOf(ref,col,data);if(!newKey)throw new Error('La clé de cette entrée est obligatoire.');if(isNew&&currentItem(ref,col,newKey))throw new Error('Une entrée avec cette clé existe déjà.');if(!isNew&&newKey!==oldKey)throw new Error('La clé principale ne peut pas être modifiée. Crée une nouvelle entrée puis supprime l’ancienne.');const base=JSON.parse(form.dataset.base||'null');const payload={reference_key:ref,collection_key:col,entity_key:newKey,data,base_snapshot:base,is_new:isNew,is_deleted:false};const {data:saved,error}=await client.from(REF_TABLE).upsert(payload,{onConflict:'reference_key,collection_key,entity_key'}).select().single();if(error)throw error;overrides.set(mapKey(ref,col,newKey),saved);if(isNew){registryArray(ref,col).push(data);}else{Object.assign(current,data);}status('Enregistré. La modification est active immédiatement.','ok');refreshAll(ref);if(ref==='communes'){setTimeout(()=>window.C3K_COMMUNES_EDITOR_BRIDGE?.reveal?.(data.commune,data.departement),80);}setTimeout(()=>{document.getElementById('c3kReferenceEditorBackdrop').hidden=true;},650);}catch(err){status(err?.message||String(err),'error');}
  }
  async function deleteEntry(ref,col,key){
    if(!isSuper()||!confirm(`Supprimer cette entrée de ${definitions[ref].label} ?`))return;try{status('Suppression…');const existing=overrides.get(mapKey(ref,col,key)),item=currentItem(ref,col,key);const payload={reference_key:ref,collection_key:col,entity_key:key,data:existing?.data||clone(item||{}),base_snapshot:existing?.base_snapshot||clone(item||null),is_new:Boolean(existing?.is_new),is_deleted:true};const {data:saved,error}=await client.from(REF_TABLE).upsert(payload,{onConflict:'reference_key,collection_key,entity_key'}).select().single();if(error)throw error;overrides.set(mapKey(ref,col,key),saved);const arr=registryArray(ref,col),idx=arr.findIndex(x=>keyOf(ref,col,x)===key);if(idx>=0)arr.splice(idx,1);status('Entrée supprimée.','ok');refreshAll(ref);setTimeout(()=>document.getElementById('c3kReferenceEditorBackdrop').hidden=true,500);}catch(err){status(err?.message||String(err),'error');}
  }
  async function resetEntry(ref,col,key){
    if(!isSuper())return;const o=overrides.get(mapKey(ref,col,key));if(!o)return;if(o.is_new){alert('Une entrée ajoutée n’a pas de version source.');return;}if(!confirm('Revenir exactement à la version du fichier source ?'))return;try{status('Restauration…');const base=clone(o.base_snapshot||{});const {error}=await client.from(REF_TABLE).delete().eq('reference_key',ref).eq('collection_key',col).eq('entity_key',key);if(error)throw error;overrides.delete(mapKey(ref,col,key));const item=currentItem(ref,col,key);if(item){Object.keys(item).forEach(k=>delete item[k]);Object.assign(item,base);}else registryArray(ref,col).push(base);status('Version source restaurée.','ok');refreshAll(ref);setTimeout(()=>document.getElementById('c3kReferenceEditorBackdrop').hidden=true,500);}catch(err){status(err?.message||String(err),'error');}
  }
  function installDelegatedEditHandler(){
    if(document.documentElement.dataset.c3kRefEditDelegated==='1')return;
    document.documentElement.dataset.c3kRefEditDelegated='1';
    document.addEventListener('click',e=>{
      const btn=e.target?.closest?.('.c3k-ref-edit-btn');if(!btn)return;
      e.preventDefault();e.stopPropagation();
      const ref=btn.dataset.c3kEditRef,col=btn.dataset.c3kEditCollection,key=btn.dataset.c3kEditKey;
      if(ref&&col&&key)openEditor(ref,col,key,false);
    },true);
  }

  async function init(){
    installDelegatedEditHandler();
    for(let i=0;i<100&&!window.COTATION3000_SUPABASE;i++)await new Promise(r=>setTimeout(r,80));client=window.COTATION3000_SUPABASE||(window.supabase?.createClient?window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true}}):null);if(!client)return;await resolveRole();await loadOverrides();bind(document);injectAddButtons();
    const paginationHost=document.getElementById('pagination');
    if(paginationHost&&!paginationHost._c3kAddObserver){const obs=new MutationObserver(()=>ensureCommunesAddButton());obs.observe(paginationHost,{childList:true});paginationHost._c3kAddObserver=obs;}
    client.auth.onAuthStateChange(()=>setTimeout(async()=>{await resolveRole();bind(document);injectAddButtons();},0));window.addEventListener('c3k:account-state',e=>{profile=e.detail?.profile||null;role=e.detail?.role||'guest';bind(document);injectAddButtons();});
  }
  window.C3K_REFERENCE_EDITOR={bind,get role(){return role},openEditor};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
