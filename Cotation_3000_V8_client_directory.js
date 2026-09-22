/* Cotation 3000 V9.0.1.2.6 — Annuaire privé + import téléphones internes */
(() => {
  'use strict';

  const TABLE_COMPANIES='client_companies';
  const TABLE_CONTACTS='client_contacts';
  const TABLE_SUGGESTIONS='client_contact_suggestions';
  const TABLE_INTERNAL='internal_directory_lines';
  const MEDIA_BUCKET='c3k-reference-media';
  const INTERNAL_DEFAULT_COLOR='#85754e';
  const INTERNAL_BADGE_PALETTE=['#85754e','#2563eb','#0891b2','#0f766e','#059669','#65a30d','#d97706','#dc2626','#be185d','#7c3aed','#475569','#111827'];
  const INTERNAL_ICON_PRESETS=['☎','📞','👥','🚚','⚓','📦','💼','🧾','🛠','🚨','🖥','🏢'];
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,' ').replace(/\s+/g,' ').trim();
  const initials=v=>String(v||'').trim().split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join('').toUpperCase()||'CL';
  const state={client:null,session:null,profile:null,role:'guest',companies:[],contacts:[],internalLines:[],tab:'contacts',query:'',companyFilter:'',loaded:false,loading:false};
  const isMember=()=>Boolean(state.session?.user);
  const isSuper=()=>state.role==='superadmin';
  const companyById=id=>state.companies.find(x=>String(x.id)===String(id))||null;
  const activeCompanies=()=>state.companies.filter(x=>x.is_active!==false);
  const activeContacts=()=>state.contacts.filter(x=>x.is_active!==false);
  const activeInternalLines=()=>state.internalLines.filter(x=>x.is_active!==false);
  const safeBadgeColor=value=>/^#[0-9a-f]{6}$/i.test(String(value||''))?String(value).toUpperCase():INTERNAL_DEFAULT_COLOR;
  const badgeInk=value=>{const hex=safeBadgeColor(value).slice(1),r=parseInt(hex.slice(0,2),16),g=parseInt(hex.slice(2,4),16),b=parseInt(hex.slice(4,6),16);return ((r*299+g*587+b*114)/1000)>160?'#171717':'#ffffff';};
  const internalLineDisplay=value=>{const raw=String(value||'').trim();const m=raw.match(/\d+[A-Za-z]?/);return (m?.[0]||raw||'—').slice(0,6);};
  const internalServiceStyles=()=>{const map=new Map();for(const line of activeInternalLines()){const key=norm(line.service);if(key&&!map.has(key))map.set(key,{service:String(line.service||''),badge_color:safeBadgeColor(line.badge_color),icon_text:String(line.icon_text||'☎')});}return [...map.values()].sort((a,b)=>a.service.localeCompare(b.service,'fr'));};

  function companyLogoUrl(company){return String(company?.logo_url||'').trim();}
  function companyLogoMarkup(company,fallbackLabel='',extraClass=''){
    const label=String(company?.name||company?.commercial_name||fallbackLabel||'Client');
    const logo=companyLogoUrl(company);
    const fallback=esc(initials(company?label:'CL'));
    const cls=`c3k-client-avatar${logo?' has-logo':''}${extraClass?' '+extraClass:''}`;
    if(logo)return `<div class="${cls}" title="${esc(label)}"><img src="${esc(logo)}" alt="Logo ${esc(label)}" loading="lazy" referrerpolicy="no-referrer" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><span class="c3k-client-avatar-fallback" hidden>${fallback}</span></div>`;
    return `<div class="${cls}" title="${esc(label)}"><span class="c3k-client-avatar-fallback">${fallback}</span></div>`;
  }
  async function uploadCompanyLogo(key,file){
    if(!file)return'';
    if(file.size>2097152)throw new Error('Le logo dépasse 2 Mo.');
    if(!['image/png','image/jpeg','image/webp'].includes(file.type))throw new Error('Format non autorisé. Utilise PNG, JPG ou WebP.');
    const ext=file.type==='image/png'?'png':file.type==='image/webp'?'webp':'jpg';
    const safe=String(key||'societe').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9_-]+/gi,'-').replace(/^-+|-+$/g,'').toLowerCase()||'societe';
    const path=`client-directory/companies/${safe}-${Date.now()}.${ext}`;
    const {error}=await state.client.storage.from(MEDIA_BUCKET).upload(path,file,{cacheControl:'3600',upsert:false,contentType:file.type});
    if(error)throw error;
    return state.client.storage.from(MEDIA_BUCKET).getPublicUrl(path).data.publicUrl||'';
  }

  function iconSvg(){return '<svg aria-hidden="true" class="c3k-icon" focusable="false" viewBox="0 0 24 24"><path d="M6 4.5h11.5a2 2 0 0 1 2 2v13H6a2.5 2.5 0 0 1 0-5h13.5"></path><path d="M6 4.5v10M9 9h6M9 12h5"></path><circle cx="13.5" cy="7" r="1.7"></circle></svg>';}

  function buildToolbarButton(){
    const host=document.querySelector('#compactToolbar .toolbar-primary-actions');if(!host||document.getElementById('clientDirectoryBtn'))return;
    const btn=document.createElement('button');btn.type='button';btn.id='clientDirectoryBtn';btn.className='card-ghost-btn';btn.hidden=true;btn.title='Annuaire clients';btn.setAttribute('aria-label','Ouvrir l’annuaire clients');btn.innerHTML=iconSvg();
    host.insertBefore(btn,host.firstElementChild);btn.addEventListener('click',openDirectory);
  }

  function buildModal(){
    if(document.getElementById('clientDirectoryBackdrop'))return;
    document.body.insertAdjacentHTML('beforeend',`<div class="c3k-client-directory-backdrop" id="clientDirectoryBackdrop" hidden>
      <section class="c3k-client-directory" role="dialog" aria-modal="true" aria-labelledby="clientDirectoryTitle">
        <header class="c3k-client-directory-head">
          <div class="c3k-client-directory-title">${iconSvg()}<div><h2 id="clientDirectoryTitle">Annuaire</h2><p>Accessible uniquement aux membres connectés · Contacts, Sociétés et Interne</p></div></div>
          <div class="c3k-client-directory-head-actions"><button class="c3k-client-directory-add" id="clientDirectoryAdd" type="button" hidden>＋ Ajouter</button><button class="c3k-client-directory-close" id="clientDirectoryClose" type="button" aria-label="Fermer">×</button></div>
        </header>
        <div class="c3k-client-directory-body">
          <div class="c3k-client-directory-tools">
            <div class="c3k-client-directory-tabs"><button type="button" data-client-tab="contacts" class="is-active">Contacts <span id="clientDirectoryContactCount"></span></button><button type="button" data-client-tab="companies">Sociétés <span id="clientDirectoryCompanyCount"></span></button><button type="button" data-client-tab="internal">Interne <span id="clientDirectoryInternalCount"></span></button></div>
            <input class="c3k-client-directory-search" id="clientDirectorySearch" type="search" autocomplete="off" placeholder="Rechercher un contact, une société, une ligne interne…">
            <div class="c3k-client-directory-count" id="clientDirectoryCount"></div>
          </div>
          <div class="c3k-client-directory-grid" id="clientDirectoryGrid"></div>
        </div>
      </section>
    </div>`);
    const back=document.getElementById('clientDirectoryBackdrop');
    document.getElementById('clientDirectoryClose').addEventListener('click',closeDirectory);
    back.addEventListener('pointerdown',e=>{if(e.target===back)closeDirectory();});
    document.getElementById('clientDirectorySearch').addEventListener('input',e=>{state.query=e.target.value;render();});
    document.querySelectorAll('[data-client-tab]').forEach(btn=>btn.addEventListener('click',()=>{state.tab=btn.dataset.clientTab;state.companyFilter='';document.querySelectorAll('[data-client-tab]').forEach(x=>x.classList.toggle('is-active',x===btn));render();}));
    document.getElementById('clientDirectoryAdd').addEventListener('click',()=>openEditor(state.tab==='contacts'?'contact':state.tab==='companies'?'company':'internal',null));
  }

  function buildEditor(){
    if(document.getElementById('clientDirectoryEditorBackdrop'))return;
    document.body.insertAdjacentHTML('beforeend',`<div class="c3k-client-editor-backdrop" id="clientDirectoryEditorBackdrop" hidden><section class="c3k-client-editor" role="dialog" aria-modal="true" aria-labelledby="clientDirectoryEditorTitle"><header><strong id="clientDirectoryEditorTitle">Annuaire</strong><button type="button" id="clientDirectoryEditorClose" aria-label="Fermer">×</button></header><div class="c3k-client-editor-form" id="clientDirectoryEditorFields"></div><div class="c3k-client-editor-status" id="clientDirectoryEditorStatus" hidden></div><footer class="c3k-client-editor-actions"><button type="button" id="clientDirectoryDeactivate" hidden>Désactiver</button><span class="spacer"></span><button type="button" id="clientDirectoryEditorCancel">Annuler</button><button type="button" class="save" id="clientDirectoryEditorSave">💾 Enregistrer</button></footer></section></div>`);
    const back=document.getElementById('clientDirectoryEditorBackdrop');const close=()=>back.hidden=true;
    document.getElementById('clientDirectoryEditorClose').onclick=close;document.getElementById('clientDirectoryEditorCancel').onclick=close;back.addEventListener('pointerdown',e=>{if(e.target===back)close();});
  }

  function companyOptions(selected=''){return `<option value="">— Aucune société —</option>${activeCompanies().sort((a,b)=>String(a.name).localeCompare(String(b.name),'fr')).map(c=>`<option value="${esc(c.id)}"${String(c.id)===String(selected)?' selected':''}>${esc(c.name)}</option>`).join('')}`;}
  function companyDatalist(){return `<datalist id="c3kClientCompanyList">${activeCompanies().sort((a,b)=>String(a.name).localeCompare(String(b.name),'fr')).map(c=>`<option value="${esc(c.name)}">${esc(c.commercial_name||'')}</option>`).join('')}</datalist>`;}
  function companyNameForContact(contact){return companyById(contact?.company_id)?.name||'';}
  async function resolveCompanyId(name){
    const value=String(name||'').trim();if(!value)return null;
    const local=state.companies.find(c=>norm(c.name)===norm(value)||norm(c.commercial_name)===norm(value));if(local)return local.id;
    const {data,error}=await state.client.rpc('resolve_or_create_client_company',{p_name:value});if(error)throw error;
    return data||null;
  }
  function safeInput(name,label,value='',type='text',wide=false,required=false){return `<label${wide?' class="is-wide"':''}>${esc(label)}<input data-c3k-client-field="${esc(name)}" type="${esc(type)}" value="${esc(value??'')}" autocomplete="one-time-code" data-1p-ignore="true" data-lpignore="true"${required?' required':''}></label>`;}
  function safeTextarea(name,label,value=''){return `<label class="is-wide">${esc(label)}<textarea data-c3k-client-field="${esc(name)}" autocomplete="one-time-code" data-1p-ignore="true" data-lpignore="true">${esc(value??'')}</textarea></label>`;}
  function editorStatus(msg,type=''){const n=document.getElementById('clientDirectoryEditorStatus');n.hidden=false;n.className='c3k-client-editor-status'+(type?` is-${type}`:'');n.textContent=msg;}
  function companyLogoEditorMarkup(company){
    const logo=companyLogoUrl(company);const label=String(company?.name||company?.commercial_name||'Société');
    return `<div class="c3k-client-logo-box is-wide"><div class="c3k-client-logo-preview" id="clientDirectoryLogoPreview">${logo?`<img src="${esc(logo)}" alt="Logo ${esc(label)}">`:`<span>${esc(initials(label))}</span>`}</div><div class="c3k-client-logo-copy"><strong>Logo / icône de la société</strong><input id="clientDirectoryLogoFile" type="file" accept="image/png,image/jpeg,image/webp"><small>PNG, JPG ou WebP · 2 Mo maximum. Tous les contacts affiliés héritent automatiquement de ce logo.</small>${logo?`<label class="c3k-client-logo-remove"><input id="clientDirectoryLogoRemove" type="checkbox"> Supprimer le logo actuel</label>`:''}</div></div>`;
  }

  function openEditor(kind,row){
    if(!isSuper())return;buildEditor();const fields=document.getElementById('clientDirectoryEditorFields'),title=document.getElementById('clientDirectoryEditorTitle'),deactivate=document.getElementById('clientDirectoryDeactivate'),save=document.getElementById('clientDirectoryEditorSave');
    const isContact=kind==='contact',isCompany=kind==='company',isInternal=kind==='internal';
    const kindLabel=isContact?'le contact':isCompany?'la société':'la ligne interne';
    title.textContent=row?`Modifier ${kindLabel}`:`Ajouter ${isContact?'un contact':isCompany?'une société':'une ligne interne'}`;
    if(isContact){
      const x=row||{},companyName=companyNameForContact(x);
      fields.innerHTML=`${safeInput('first_name','Prénom',x.first_name,'text',false,true)}${safeInput('last_name','Nom',x.last_name,'text',false,true)}<label>Société<input data-c3k-client-field="company_name" type="text" value="${esc(companyName)}" list="c3kClientCompanyList" autocomplete="off" placeholder="Choisir ou saisir une nouvelle société"></label>${companyDatalist()}${safeInput('job_title','Fonction',x.job_title)}${safeInput('email','E-mail',x.email,'email',true)}${safeInput('phone','Téléphone',x.phone)}${safeInput('mobile','Portable',x.mobile)}${safeTextarea('notes','Notes',x.notes)}`;
    }else if(isCompany){
      const x=row||{};fields.innerHTML=`${companyLogoEditorMarkup(x)}${safeInput('name','Raison sociale',x.name,'text',true,true)}${safeInput('commercial_name','Nom commercial',x.commercial_name)}${safeInput('account_number','N° de compte',x.account_number)}${safeInput('generic_email','E-mail générique',x.generic_email,'email',true)}${safeInput('phone','Téléphone général',x.phone)}${safeInput('address_line1','Adresse',x.address_line1,'text',true)}${safeInput('address_line2','Complément adresse',x.address_line2,'text',true)}${safeInput('postal_code','Code postal',x.postal_code)}${safeInput('city','Ville',x.city)}${safeInput('country','Pays',x.country)}${safeTextarea('notes','Notes',x.notes)}`;
    }else if(isInternal){
      const x=row||{},color=safeBadgeColor(x.badge_color),icon=String(x.icon_text||'☎'),services=internalServiceStyles();
      fields.innerHTML=`${safeInput('label','Libellé',x.label,'text',true,true)}${safeInput('line_number','Ligne',x.line_number)}${safeInput('phone','Téléphone',x.phone,'tel',false,true)}<label>Service<input data-c3k-client-field="service" id="c3kInternalServiceInput" type="text" value="${esc(x.service||'')}" list="c3kInternalServiceList" autocomplete="off" placeholder="Ex. Exploitation, Commercial, Standard…"></label><datalist id="c3kInternalServiceList">${services.map(s=>`<option value="${esc(s.service)}"></option>`).join('')}</datalist>${safeInput('sort_order','Ordre',x.sort_order??0,'number')}<div class="c3k-internal-style-editor is-wide"><div class="c3k-internal-style-preview" id="c3kInternalStylePreview" style="--internal-color:${esc(color)};--internal-ink:${esc(badgeInk(color))}"><span class="c3k-internal-style-preview-icon" id="c3kInternalPreviewIcon">${esc(icon)}</span><span class="c3k-internal-style-preview-service" id="c3kInternalPreviewService">${esc(x.service||'Service')}</span></div><label class="c3k-internal-color-field">Couleur du badge<input data-c3k-client-field="badge_color" id="c3kInternalBadgeColor" type="color" value="${esc(color)}"></label><div class="c3k-internal-color-palette">${INTERNAL_BADGE_PALETTE.map(c=>`<button type="button" data-c3k-internal-color="${c}" style="--swatch:${c}" aria-label="Choisir ${c}" title="${c}"></button>`).join('')}</div><label class="c3k-internal-icon-field">Icône personnalisée<input data-c3k-client-field="icon_text" id="c3kInternalIconText" type="text" value="${esc(icon)}" maxlength="12" autocomplete="off" placeholder="☎ ou emoji"></label><div class="c3k-internal-icon-presets">${INTERNAL_ICON_PRESETS.map(v=>`<button type="button" data-c3k-internal-icon="${esc(v)}">${esc(v)}</button>`).join('')}</div><small>Le badge du service et le carré de ligne reprennent cette couleur. L’icône peut être un emoji ou un symbole court.</small></div>${safeTextarea('notes','Notes',x.notes)}`;
    }
    document.getElementById('clientDirectoryEditorStatus').hidden=true;deactivate.hidden=!row;deactivate.textContent=row?.is_active===false?'Réactiver':'Désactiver';
    save.onclick=()=>saveEditor(kind,row||null);deactivate.onclick=()=>toggleActive(kind,row);
    document.getElementById('clientDirectoryLogoFile')?.addEventListener('change',e=>{const f=e.target.files?.[0];if(!f)return;const url=URL.createObjectURL(f),preview=document.getElementById('clientDirectoryLogoPreview');if(preview)preview.innerHTML=`<img src="${esc(url)}" alt="Aperçu logo">`;const remove=document.getElementById('clientDirectoryLogoRemove');if(remove)remove.checked=false;});
    document.getElementById('clientDirectoryLogoRemove')?.addEventListener('change',e=>{if(!e.target.checked)return;const preview=document.getElementById('clientDirectoryLogoPreview'),name=fields.querySelector('[data-c3k-client-field="name"]')?.value||row?.name||'Société';if(preview)preview.innerHTML=`<span>${esc(initials(name))}</span>`;const file=document.getElementById('clientDirectoryLogoFile');if(file)file.value='';});
    if(isInternal){
      const serviceInput=document.getElementById('c3kInternalServiceInput'),colorInput=document.getElementById('c3kInternalBadgeColor'),iconInput=document.getElementById('c3kInternalIconText'),preview=document.getElementById('c3kInternalStylePreview'),previewIcon=document.getElementById('c3kInternalPreviewIcon'),previewService=document.getElementById('c3kInternalPreviewService');
      const refreshPreview=()=>{const color=safeBadgeColor(colorInput?.value),ink=badgeInk(color);if(preview){preview.style.setProperty('--internal-color',color);preview.style.setProperty('--internal-ink',ink);}if(previewIcon)previewIcon.textContent=String(iconInput?.value||'☎');if(previewService)previewService.textContent=String(serviceInput?.value||'Service');};
      fields.querySelectorAll('[data-c3k-internal-color]').forEach(btn=>btn.addEventListener('click',()=>{if(colorInput)colorInput.value=btn.dataset.c3kInternalColor||INTERNAL_DEFAULT_COLOR;refreshPreview();}));
      fields.querySelectorAll('[data-c3k-internal-icon]').forEach(btn=>btn.addEventListener('click',()=>{if(iconInput)iconInput.value=btn.dataset.c3kInternalIcon||'☎';refreshPreview();}));
      colorInput?.addEventListener('input',refreshPreview);iconInput?.addEventListener('input',refreshPreview);serviceInput?.addEventListener('input',refreshPreview);
      serviceInput?.addEventListener('change',()=>{const found=internalServiceStyles().find(v=>norm(v.service)===norm(serviceInput.value));if(found){if(colorInput)colorInput.value=found.badge_color;if(iconInput)iconInput.value=found.icon_text;refreshPreview();}});
    }
    document.getElementById('clientDirectoryEditorBackdrop').hidden=false;
  }

  function editorData(){const out={};document.querySelectorAll('#clientDirectoryEditorFields [data-c3k-client-field]').forEach(el=>{out[el.dataset.c3kClientField]=String(el.value||'').trim()||null;});return out;}
  async function saveEditor(kind,row){
    const id=row?.id||null,data=editorData();
    if(kind==='company'&&!data.name){editorStatus('La raison sociale est obligatoire.','error');return;}
    if(kind==='contact'&&(!data.first_name||!data.last_name)){editorStatus('Le prénom et le nom sont obligatoires.','error');return;}
    if(kind==='internal'&&(!data.label||!data.phone)){editorStatus('Le libellé et le téléphone sont obligatoires.','error');return;}
    try{
      editorStatus('Enregistrement…');
      if(kind==='contact'){
        const companyName=data.company_name;delete data.company_name;
        data.display_name=[data.first_name,data.last_name].filter(Boolean).join(' ').replace(/\s+/g,' ').trim();
        data.company_id=await resolveCompanyId(companyName);
      }
      if(kind==='company'){
        data.logo_url=companyLogoUrl(row)||null;
        if(document.getElementById('clientDirectoryLogoRemove')?.checked)data.logo_url=null;
        const file=document.getElementById('clientDirectoryLogoFile')?.files?.[0];
        if(file)data.logo_url=await uploadCompanyLogo(id||data.name,file);
      }
      if(kind==='internal'){data.sort_order=Number.isFinite(Number(data.sort_order))?Number(data.sort_order):0;data.phone=String(data.phone||'').trim()||null;data.badge_color=safeBadgeColor(data.badge_color);data.icon_text=String(data.icon_text||'☎').slice(0,12);}
      const table=kind==='company'?TABLE_COMPANIES:kind==='contact'?TABLE_CONTACTS:TABLE_INTERNAL;
      let q=id?state.client.from(table).update({...data,is_active:true}).eq('id',id):state.client.from(table).insert({...data,is_active:true});
      const {error}=await q;if(error)throw error;editorStatus('Enregistré.','ok');await loadData(true);setTimeout(()=>{document.getElementById('clientDirectoryEditorBackdrop').hidden=true;},350);
    }catch(err){editorStatus(err?.message||String(err),'error');}
  }

  async function toggleActive(kind,row){if(!row)return;const table=kind==='company'?TABLE_COMPANIES:kind==='contact'?TABLE_CONTACTS:TABLE_INTERNAL;const {error}=await state.client.from(table).update({is_active:row.is_active===false}).eq('id',row.id);if(error){editorStatus(error.message,'error');return;}await loadData(true);document.getElementById('clientDirectoryEditorBackdrop').hidden=true;}

  function contactMatches(c,q){const cp=companyById(c.company_id);const hay=norm([c.display_name,c.first_name,c.last_name,c.job_title,c.email,c.phone,c.mobile,cp?.name,cp?.commercial_name].join(' '));return !q||q.split(' ').every(t=>hay.includes(t));}
  function companyMatches(c,q){const hay=norm([c.name,c.commercial_name,c.account_number,c.generic_email,c.phone,c.address_line1,c.postal_code,c.city,c.country,c.notes].join(' '));return !q||q.split(' ').every(t=>hay.includes(t));}
  function internalMatches(c,q){const hay=norm([c.label,c.line_number,c.phone,c.service,c.icon_text,c.notes].join(' '));return !q||q.split(' ').every(t=>hay.includes(t));}
  function contactCard(c){const cp=companyById(c.company_id);return `<article class="c3k-client-card"><div class="c3k-client-card-top">${companyLogoMarkup(cp,c.display_name)}<div class="c3k-client-card-main"><h3>${esc(c.display_name)}</h3><div class="c3k-client-sub">${esc(c.job_title||'Contact')}</div>${cp?`<div class="c3k-client-company">${esc(cp.name)}</div>`:''}</div></div><div class="c3k-client-meta"><span><b>E-mail</b>${esc(c.email||'—')}</span><span><b>Téléphone</b>${esc(c.phone||c.mobile||'—')}</span></div><div class="c3k-client-card-actions">${isSuper()?`<button type="button" data-client-edit-contact="${esc(c.id)}">⚙ Modifier</button>`:''}${c.company_id?`<button type="button" data-client-company="${esc(c.company_id)}">Voir société</button>`:''}<button type="button" class="is-primary" data-client-use-contact="${esc(c.id)}">Utiliser dans la cotation</button></div></article>`;}
  function companyCard(c){const linked=activeContacts().filter(x=>String(x.company_id)===String(c.id));return `<article class="c3k-client-card"><div class="c3k-client-card-top">${companyLogoMarkup(c,c.name)}<div class="c3k-client-card-main"><h3>${esc(c.name)}</h3><div class="c3k-client-sub">${esc(c.commercial_name||c.city||'Société')}</div></div></div><div class="c3k-client-meta"><span><b>E-mail</b>${esc(c.generic_email||'—')}</span><span><b>Téléphone</b>${esc(c.phone||'—')}</span><span><b>Ville</b>${esc([c.postal_code,c.city].filter(Boolean).join(' ')||'—')}</span><span><b>Contacts</b>${linked.length}</span></div><div class="c3k-client-card-actions">${isSuper()?`<button type="button" data-client-edit-company="${esc(c.id)}">⚙ Modifier</button>`:''}<button type="button" data-client-show-contacts="${esc(c.id)}">${linked.length} contact${linked.length>1?'s':''}</button></div></article>`;}
  function internalCard(c){const color=safeBadgeColor(c.badge_color),ink=badgeInk(color),icon=String(c.icon_text||'☎'),line=internalLineDisplay(c.line_number);return `<article class="c3k-client-card c3k-internal-card" style="--internal-color:${esc(color)};--internal-ink:${esc(ink)}"><div class="c3k-client-card-top"><div class="c3k-internal-line-square" title="${esc(c.line_number||'Ligne interne')}"><span>${esc(line)}</span><small>LIGNE</small></div><div class="c3k-client-card-main"><h3>${esc(c.label)}</h3><div class="c3k-internal-service-badge"><span class="c3k-internal-service-icon">${esc(icon)}</span><span>${esc(c.service||'Interne')}</span></div></div></div><div class="c3k-client-meta"><span><b>Téléphone</b><a class="c3k-internal-phone" href="tel:${esc(String(c.phone||'').replace(/[^0-9+]/g,''))}">${esc(c.phone||'—')}</a></span><span><b>Ligne interne</b>${esc(c.line_number||'—')}</span></div><div class="c3k-client-card-actions">${isSuper()?`<button type="button" data-client-edit-internal="${esc(c.id)}">⚙ Modifier</button>`:''}</div></article>`;}

  function render(){
    buildModal();const grid=document.getElementById('clientDirectoryGrid'),q=norm(state.query);let rows=[];
    document.getElementById('clientDirectoryAdd').hidden=!isSuper();document.getElementById('clientDirectoryContactCount').textContent=`(${activeContacts().length})`;document.getElementById('clientDirectoryCompanyCount').textContent=`(${activeCompanies().length})`;document.getElementById('clientDirectoryInternalCount').textContent=`(${state.internalLines.filter(x=>x.is_active!==false).length})`;
    if(state.tab==='contacts'){
      rows=activeContacts().filter(c=>(!state.companyFilter||String(c.company_id)===String(state.companyFilter))&&contactMatches(c,q));grid.innerHTML=rows.length?rows.map(contactCard).join(''):'<div class="c3k-client-empty">Aucun contact ne correspond à cette recherche.</div>';
    }else if(state.tab==='companies'){
      rows=activeCompanies().filter(c=>companyMatches(c,q));grid.innerHTML=rows.length?rows.map(companyCard).join(''):'<div class="c3k-client-empty">Aucune société ne correspond à cette recherche.</div>';
    }else{
      rows=state.internalLines.filter(c=>c.is_active!==false&&internalMatches(c,q)).sort((a,b)=>(Number(a.sort_order)||0)-(Number(b.sort_order)||0)||String(a.label).localeCompare(String(b.label),'fr'));grid.innerHTML=rows.length?rows.map(internalCard).join(''):'<div class="c3k-client-empty">Aucune ligne interne ne correspond à cette recherche.</div>';
    }
    document.getElementById('clientDirectoryCount').textContent=`${rows.length} résultat${rows.length>1?'s':''}`;
    grid.querySelectorAll('[data-client-edit-contact]').forEach(b=>b.onclick=()=>openEditor('contact',state.contacts.find(x=>String(x.id)===String(b.dataset.clientEditContact))));
    grid.querySelectorAll('[data-client-edit-company]').forEach(b=>b.onclick=()=>openEditor('company',state.companies.find(x=>String(x.id)===String(b.dataset.clientEditCompany))));
    grid.querySelectorAll('[data-client-edit-internal]').forEach(b=>b.onclick=()=>openEditor('internal',state.internalLines.find(x=>String(x.id)===String(b.dataset.clientEditInternal))));
    grid.querySelectorAll('[data-client-use-contact]').forEach(b=>b.onclick=()=>{const c=state.contacts.find(x=>String(x.id)===String(b.dataset.clientUseContact));if(c){applyContactToQuote(c);closeDirectory();document.getElementById('mailSheetButton')?.click();}});
    grid.querySelectorAll('[data-client-company]').forEach(b=>b.onclick=()=>{state.tab='companies';state.query='';document.getElementById('clientDirectorySearch').value='';document.querySelectorAll('[data-client-tab]').forEach(x=>x.classList.toggle('is-active',x.dataset.clientTab==='companies'));const company=companyById(b.dataset.clientCompany);state.query=company?.name||'';document.getElementById('clientDirectorySearch').value=state.query;render();});
    grid.querySelectorAll('[data-client-show-contacts]').forEach(b=>b.onclick=()=>{state.tab='contacts';state.companyFilter=b.dataset.clientShowContacts;state.query='';document.getElementById('clientDirectorySearch').value='';document.querySelectorAll('[data-client-tab]').forEach(x=>x.classList.toggle('is-active',x.dataset.clientTab==='contacts'));render();});
  }

  function directorySearchScore(primary,haystack,q,digitsQuery='',digitsHaystack=''){
    const p=norm(primary),h=norm(haystack);if(!q)return Number.POSITIVE_INFINITY;
    if(p===q)return 0;if(p.startsWith(q))return 1;if(h.includes(q))return 2;
    if(digitsQuery&&digitsHaystack.includes(digitsQuery))return 1;
    return Number.POSITIVE_INFINITY;
  }
  function searchEverywhere(rawQuery,limit=12){
    if(!isMember()||!state.loaded)return[];const raw=String(rawQuery||'').trim(),q=norm(raw);if(q.length<2&&!/\d{2,}/.test(raw))return[];const digits=raw.replace(/\D+/g,'');const out=[];
    for(const c of activeContacts()){const cp=companyById(c.company_id),hay=[c.display_name,c.first_name,c.last_name,c.job_title,c.email,c.phone,c.mobile,cp?.name,cp?.commercial_name].join(' '),score=directorySearchScore(c.display_name,hay,q,digits,[c.phone,c.mobile].join('').replace(/\D+/g,''));if(Number.isFinite(score))out.push({type:'contact',id:c.id,tab:'contacts',query:c.display_name,title:c.display_name,meta:[c.job_title,cp?.name,c.email,c.phone||c.mobile].filter(Boolean).join(' · '),state:'Contact',icon:'👤',color:'',score});}
    for(const c of activeCompanies()){const hay=[c.name,c.commercial_name,c.account_number,c.generic_email,c.phone,c.address_line1,c.postal_code,c.city,c.country].join(' '),score=directorySearchScore(c.name,hay,q,digits,String(c.phone||'').replace(/\D+/g,''));if(Number.isFinite(score))out.push({type:'company',id:c.id,tab:'companies',query:c.name,title:c.name,meta:[c.commercial_name,c.city,c.phone].filter(Boolean).join(' · '),state:'Société',icon:'🏢',color:'',score});}
    for(const c of activeInternalLines()){const hay=[c.label,c.line_number,c.phone,c.service,c.icon_text,c.notes].join(' '),score=directorySearchScore(c.label,hay,q,digits,[c.line_number,c.phone].join('').replace(/\D+/g,''));if(Number.isFinite(score))out.push({type:'internal',id:c.id,tab:'internal',query:c.label||c.line_number||c.phone,title:c.label||'Ligne interne',meta:[c.service,c.line_number,c.phone].filter(Boolean).join(' · '),state:c.line_number||'Interne',icon:String(c.icon_text||'☎'),color:safeBadgeColor(c.badge_color),score});}
    return out.sort((a,b)=>a.score-b.score||String(a.title).localeCompare(String(b.title),'fr')).slice(0,Math.max(1,Number(limit)||12));
  }
  async function openSearch(tab='contacts',query=''){
    if(!isMember()){document.getElementById('c3kV8AccountBtn')?.click();return;}buildModal();state.tab=['contacts','companies','internal'].includes(tab)?tab:'contacts';state.companyFilter='';state.query=String(query||'');document.getElementById('clientDirectoryBackdrop').hidden=false;document.body.style.overflow='hidden';await loadData();const input=document.getElementById('clientDirectorySearch');if(input)input.value=state.query;document.querySelectorAll('[data-client-tab]').forEach(x=>x.classList.toggle('is-active',x.dataset.clientTab===state.tab));render();requestAnimationFrame(()=>input?.focus());
  }

  async function loadData(force=false){
    if(!isMember()||!state.client)return;if(state.loading)return;if(state.loaded&&!force){render();return;}state.loading=true;
    const [{data:companies,error:ce},{data:contacts,error:co},{data:internalLines,error:ie}]=await Promise.all([
      state.client.from(TABLE_COMPANIES).select('*').order('name'),
      state.client.from(TABLE_CONTACTS).select('*').order('display_name'),
      state.client.from(TABLE_INTERNAL).select('*').order('sort_order').order('label')
    ]);state.loading=false;
    if(ce||co||ie){console.warn('C3K annuaire',ce||co||ie);return;}state.companies=companies||[];state.contacts=contacts||[];state.internalLines=internalLines||[];state.loaded=true;render();refreshQuoteSuggestions();window.dispatchEvent(new CustomEvent('c3k:client-directory-loaded',{detail:{companies:state.companies.length,contacts:state.contacts.length,internalLines:state.internalLines.length}}));
  }

  async function openDirectory(){if(!isMember()){document.getElementById('c3kV8AccountBtn')?.click();return;}buildModal();document.getElementById('clientDirectoryBackdrop').hidden=false;document.body.style.overflow='hidden';await loadData();requestAnimationFrame(()=>document.getElementById('clientDirectorySearch')?.focus());}
  function closeDirectory(){const b=document.getElementById('clientDirectoryBackdrop');if(b)b.hidden=true;document.body.style.overflow='';}

  function applyContactToQuote(contact){
    const cp=companyById(contact.company_id);const set=(id,value)=>{const el=document.getElementById(id);if(el&&value!==null&&value!==undefined&&String(value)!==''){el.value=String(value);el.dispatchEvent(new Event('input',{bubbles:true}));el.dispatchEvent(new Event('change',{bubbles:true}));}};
    set('mailQuoteAttention',contact.display_name||[contact.first_name,contact.last_name].filter(Boolean).join(' '));set('mailQuoteCompany',cp?.name||cp?.commercial_name||'');set('mailExcelEmail',contact.email||cp?.generic_email||'');set('mailExcelPhone',contact.phone||cp?.phone||'');set('mailExcelMobile',contact.mobile||'');
    const att=document.getElementById('mailQuoteAttention');if(att){att.dataset.c3kClientContactId=contact.id;att.dataset.c3kClientContactValue=String(att.value||'');}
  }

  function setupQuoteAutocomplete(){
    const input=document.getElementById('mailQuoteAttention');if(!input||input.dataset.c3kDirectoryReady==='1')return;input.dataset.c3kDirectoryReady='1';const field=input.closest('.mail-field')||input.parentElement;field.classList.add('c3k-client-attention-field');field.style.position='relative';const box=document.createElement('div');box.className='c3k-client-quote-suggest';box.id='c3kClientQuoteSuggest';box.hidden=true;field.appendChild(box);
    const draw=()=>{if(!isMember()||!state.loaded){box.hidden=true;return;}const q=norm(input.value);if(!q){box.hidden=true;return;}const matches=activeContacts().filter(c=>contactMatches(c,q)).slice(0,8);if(!matches.length){box.hidden=true;return;}box.innerHTML=matches.map(c=>{const cp=companyById(c.company_id);return `<button type="button" data-client-quote-contact="${esc(c.id)}">${companyLogoMarkup(cp,c.display_name,' is-small')}<span class="c3k-client-suggest-copy"><strong>${esc(c.display_name)}</strong><small>${esc([cp?.name,c.email].filter(Boolean).join(' · '))}</small></span><span class="badge">ANNUAIRE</span></button>`;}).join('');box.hidden=false;};
    input.addEventListener('input',()=>{if(input.value!==input.dataset.c3kClientContactValue){delete input.dataset.c3kClientContactId;delete input.dataset.c3kClientContactValue;}draw();});input.addEventListener('focus',draw);input.addEventListener('keydown',e=>{if(e.key==='Escape')box.hidden=true;});box.addEventListener('pointerdown',e=>{const btn=e.target.closest('[data-client-quote-contact]');if(!btn)return;e.preventDefault();const c=state.contacts.find(x=>String(x.id)===String(btn.dataset.clientQuoteContact));if(c){applyContactToQuote(c);box.hidden=true;}});document.addEventListener('pointerdown',e=>{if(!field.contains(e.target))box.hidden=true;});
  }
  function refreshQuoteSuggestions(){setupQuoteAutocomplete();}

  async function reportUnknownQuoteContact(){
    if(!state.client||!state.session?.user||!['user','admin'].includes(state.role))return;const contact=document.getElementById('mailQuoteAttention'),company=document.getElementById('mailQuoteCompany'),email=document.getElementById('mailExcelEmail'),phone=document.getElementById('mailExcelPhone'),mobile=document.getElementById('mailExcelMobile');const contactName=String(contact?.value||'').trim(),companyName=String(company?.value||'').trim(),emailValue=String(email?.value||'').trim();if(!contactName&&!emailValue)return;if(contact?.dataset.c3kClientContactId)return;
    const context={quote_ref:String(document.getElementById('mailQuoteRef')?.value||''),quote_title:String(document.getElementById('mailQuoteTitleInput')?.value||''),quote_date:String(document.getElementById('mailQuoteDate')?.value||''),traffic:String(document.getElementById('mailQuoteTraffic')?.value||''),page:location.pathname||'/'};
    const {data,error}=await state.client.rpc('submit_client_contact_suggestion',{p_contact_name:contactName,p_company_name:companyName,p_email:emailValue,p_phone:String(phone?.value||''),p_mobile:String(mobile?.value||''),p_quote_context:context});if(error){console.warn('C3K nouveau contact',error);return;}if(data?.status==='reported')window.dispatchEvent(new CustomEvent('c3k:client-suggestion-created',{detail:data}));
  }
  function installQuoteDetection(){document.addEventListener('click',e=>{const trigger=e.target.closest?.('#mailSheetPdf,.mail-excel-download');if(trigger)reportUnknownQuoteContact().catch(()=>{});},true);}

  async function approveSuggestion(suggestion,mode='create'){
    if(!isSuper()||!suggestion)return;let companyId=null;const companyName=String(suggestion.company_name||'').trim();if(companyName){let cp=state.companies.find(x=>norm(x.name)===norm(companyName)||norm(x.commercial_name)===norm(companyName));if(!cp&&mode==='create'){const {data,error}=await state.client.from(TABLE_COMPANIES).insert({name:companyName,is_active:true}).select().single();if(error)throw error;cp=data;state.companies.push(data);}companyId=cp?.id||null;}
    const payload={company_id:companyId,display_name:String(suggestion.contact_name||suggestion.email||'Contact').trim(),email:suggestion.email||null,phone:suggestion.phone||null,mobile:suggestion.mobile||null,is_active:true};const {data:contact,error}=await state.client.from(TABLE_CONTACTS).insert(payload).select().single();if(error)throw error;await state.client.from(TABLE_SUGGESTIONS).update({status:'approved',resolved_by:state.session.user.id,resolved_at:new Date().toISOString(),created_contact_id:contact.id}).eq('id',suggestion.id);await loadData(true);window.dispatchEvent(new CustomEvent('c3k:client-suggestion-resolved'));return contact;
  }
  async function ignoreSuggestion(id){if(!isSuper())return;await state.client.from(TABLE_SUGGESTIONS).update({status:'ignored',resolved_by:state.session.user.id,resolved_at:new Date().toISOString()}).eq('id',id);window.dispatchEvent(new CustomEvent('c3k:client-suggestion-resolved'));}

  async function getPendingSuggestions(){if(!isSuper()||!state.client)return[];const {data,error}=await state.client.from(TABLE_SUGGESTIONS).select('*').eq('status','new').order('last_seen_at',{ascending:false});if(error)return[];return data||[];}

  function updateAccess(){const btn=document.getElementById('clientDirectoryBtn');if(btn)btn.hidden=!isMember();if(!isMember()){state.companies=[];state.contacts=[];state.internalLines=[];state.loaded=false;closeDirectory();return;}loadData(true).catch(()=>{});}

  async function waitForClient(){for(let i=0;i<120&&!window.COTATION3000_SUPABASE;i++)await new Promise(r=>setTimeout(r,75));state.client=window.COTATION3000_SUPABASE||null;}
  async function init(){buildToolbarButton();buildModal();buildEditor();installQuoteDetection();setupQuoteAutocomplete();await waitForClient();const account=window.C3K_ACCOUNT_STATE||{};state.session=account.session||null;state.profile=account.profile||null;state.role=account.role||'guest';updateAccess();window.addEventListener('c3k:account-state',e=>{state.session=e.detail?.session||null;state.profile=e.detail?.profile||null;state.role=e.detail?.role||'guest';updateAccess();});}

  window.C3K_CLIENT_DIRECTORY={open:openDirectory,openSearch,search:searchEverywhere,close:closeDirectory,load:()=>loadData(true),applyContactToQuote,getPendingSuggestions,approveSuggestion,ignoreSuggestion,get companies(){return state.companies},get contacts(){return state.contacts},get internalLines(){return state.internalLines},get role(){return state.role},get connected(){return isMember()},get loaded(){return state.loaded}};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
