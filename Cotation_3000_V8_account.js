/* Cotation 3000 V9.0.1.2.5 — Cotation_3000_V8_account.js */
(() => {
  'use strict';
  const SUPABASE_URL='https://mhnujvgzoozimtbrasuh.supabase.co';
  const SUPABASE_KEY='sb_publishable_qHIOczDD3MZoa25VO1HVAg_JOhuDUGD';
  const PRODUCTION_URL='https://cotation3000.netlify.app';
  const FAVORITES_KEY='cotation3000.favorites.v1';
  const FAVORITES_ORDER_KEY='cotation3000.favorites.order.v1';
  const SYNC_KEYS=[
    'cotation3000.density.v1','cotation3000.workspace.width.v1','cotation3000.selection.mode.v1',
    'cotation3000.route.origin.v1','cotation3000.route.return.v1','cotation3000.triangle.client.v1',
    'cotation3000.triangle.extra.stop.v1','cotation3000.stack.roundtrip.v1'
  ];
  let client=null,session=null,profile=null,presenceChannel=null,syncTimer=null;
  let reportType='bug',requestedAuthMode='login';
  const nativeSetItem=Storage.prototype.setItem;
  const nativeRemoveItem=Storage.prototype.removeItem;
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const roleLabel=r=>({user:'USER',contributor:'CONTRIBUTOR',editor:'EDITOR',admin:'ADMIN',superadmin:'SUPERADMIN'}[r]||String(r||'USER').toUpperCase());
  const reportLabel=t=>({bug:'🐞 Bug',suggestion:'💡 Suggestion',missing_data:'📚 Manque dans la base',data_correction:'✏ Correction de référentiel'}[t]||String(t||'Signalement'));
  const reportPlaceholder=t=>({bug:'Décris rapidement le bug rencontré…',suggestion:'Décris ton idée ou amélioration…',missing_data:'Indique la donnée ou l’élément manquant dans la base…',data_correction:'Indique le référentiel concerné et la correction à apporter…'}[t]||'Décris rapidement ton signalement…');
  const isAdmin=()=>['admin','superadmin'].includes(profile?.role);
  const qs=(s,p=document)=>p.querySelector(s);
  const qsa=(s,p=document)=>[...p.querySelectorAll(s)];
  const toast=(node,msg,type='')=>{if(!node)return;node.hidden=false;node.className='c3k-v8-status'+(type?` is-${type}`:'');node.textContent=msg;};

  function buildUi(){
    const searchShell=qs('#universalSearchShell');
    const accountMarkup=`
      <div class="c3k-v8-account-shell" id="c3kV8AccountShell" aria-label="Compte Cotation 3000">
        <div class="c3k-v8-account-actions">
          <button class="c3k-v8-account-btn" id="c3kV8AccountBtn" type="button"><span class="c3k-v8-account-icon" data-c3k-icon="user" aria-hidden="true"></span><span id="c3kV8AccountLabel">Se connecter</span></button>
          <button class="c3k-v8-signup-shortcut" id="c3kV8SignupShortcut" type="button">Créer un compte</button>
          <button class="c3k-v8-notify-btn" id="c3kV8NotifyBtn" type="button" hidden aria-label="Action compte"><span class="c3k-v8-action-icon" id="c3kV8HeaderActionIcon" data-c3k-icon="bell" aria-hidden="true"></span><span class="c3k-v8-notify-count" id="c3kV8NotifyCount" hidden>0</span></button>
        </div>
        <div class="c3k-v8-presence" title="Utilisateurs présents sur Cotation 3000"><span class="c3k-v8-dot"></span><span data-c3k-online-count>1 connecté</span></div>
      </div>`;
    if(searchShell) searchShell.insertAdjacentHTML('afterend',accountMarkup); else document.body.insertAdjacentHTML('beforeend',accountMarkup);
    document.body.insertAdjacentHTML('beforeend',`
      <div class="c3k-v8-panel-backdrop" id="c3kV8AccountBackdrop" hidden>
        <section class="c3k-v8-panel" role="dialog" aria-modal="true" aria-label="Compte Cotation 3000">
          <header class="c3k-v8-panel-head"><strong>Compte Cotation 3000</strong><button class="c3k-v8-close" id="c3kV8Close" type="button" aria-label="Fermer">×</button></header>
          <div class="c3k-v8-panel-body" id="c3kV8PanelBody"></div>
        </section>
      </div>
      <button class="c3k-v8-report-launch" id="c3kV8ReportLaunch" type="button" title="Suggestion, bug ou donnée manquante" aria-label="Faire un signalement">⚑</button>
      <section class="c3k-v8-report-pop" id="c3kV8ReportPop" hidden aria-label="Signalement rapide">
        <div class="c3k-v8-report-kinds">
          <button type="button" class="is-active" data-report-type="bug">🐞 Bug</button>
          <button type="button" data-report-type="suggestion">💡 Suggestion</button>
          <button type="button" data-report-type="missing_data">📚 Manque dans la base</button>
          <button type="button" data-report-type="data_correction">✏ Correction référentiel</button>
        </div>
        <div class="c3k-v8-form"><label>Une phrase suffit<textarea id="c3kV8ReportMessage" maxlength="2000" placeholder="Décris rapidement le bug rencontré…"></textarea></label></div>
        <div class="c3k-v8-actions"><button class="c3k-v8-secondary" id="c3kV8ReportCancel" type="button">Fermer</button><button class="c3k-v8-primary" id="c3kV8ReportSend" type="button">Envoyer</button></div>
        <div class="c3k-v8-status" id="c3kV8ReportStatus" hidden></div>
      </section>`);
    qs('#c3kV8AccountBtn')?.addEventListener('click',()=>openAccount('login'));
    qs('#c3kV8SignupShortcut')?.addEventListener('click',async()=>{if(session?.user){await client.auth.signOut();closeAccount();}else openAccount('signup');});
    qs('#c3kV8NotifyBtn')?.addEventListener('click',()=>{if(!session?.user)return;if(isAdmin()){openAccount();renderAdmin();return;}openReportPop();});
    qs('#c3kV8Close')?.addEventListener('click',closeAccount);
    qs('#c3kV8AccountBackdrop')?.addEventListener('pointerdown',e=>{if(e.target.id==='c3kV8AccountBackdrop')closeAccount();});
    qs('#c3kV8ReportLaunch')?.addEventListener('click',()=>{const p=qs('#c3kV8ReportPop');p.hidden=!p.hidden;if(!p.hidden)qs('#c3kV8ReportMessage')?.focus();});
    qs('#c3kV8ReportCancel')?.addEventListener('click',()=>{qs('#c3kV8ReportPop').hidden=true;});
    qsa('[data-report-type]').forEach(b=>b.addEventListener('click',()=>{reportType=b.dataset.reportType;qsa('[data-report-type]').forEach(x=>x.classList.toggle('is-active',x===b));const ta=qs('#c3kV8ReportMessage');if(ta)ta.placeholder=reportPlaceholder(reportType);}));
    qs('#c3kV8ReportSend')?.addEventListener('click',sendReport);
    document.addEventListener('keydown',e=>{if(e.key==='Escape'){closeAccount();const p=qs('#c3kV8ReportPop');if(p)p.hidden=true;}});
  }
  function scrubAuthPasswords(){
    qsa('#c3kV8LoginForm input[type="password"]').forEach(input=>{
      input.value='';input.defaultValue='';input.setAttribute('autocomplete','current-password');
    });
    qsa('#c3kV8SignupForm input[type="password"]').forEach(input=>{
      input.value='';input.defaultValue='';input.setAttribute('autocomplete','new-password');
    });
  }
  function openReportPop(){const p=qs('#c3kV8ReportPop');if(!p)return;p.hidden=false;qs('#c3kV8ReportMessage')?.focus();}
  function openAccount(mode){requestedAuthMode=mode||requestedAuthMode||'login';qs('#c3kV8AccountBackdrop').hidden=false;document.body.style.overflow='hidden';renderAccount();}
  function closeAccount(){const n=qs('#c3kV8AccountBackdrop');if(n)n.hidden=true;document.body.style.overflow='';}

  function renderAccount(){
    const body=qs('#c3kV8PanelBody');if(!body)return;
    if(!session||!profile){
      body.innerHTML=`<div class="c3k-v8-tabs"><button data-auth-tab="login">Se connecter</button><button data-auth-tab="signup">Créer un compte</button></div><div class="c3k-v8-modal-presence"><span class="c3k-v8-dot"></span><span data-c3k-online-count>1 connecté</span></div><div id="c3kV8AuthArea"></div>`;
      const wanted=requestedAuthMode==='signup'?'signup':'login';
      qsa('[data-auth-tab]',body).forEach(btn=>{btn.classList.toggle('is-active',btn.dataset.authTab===wanted);btn.addEventListener('click',()=>{requestedAuthMode=btn.dataset.authTab;qsa('[data-auth-tab]',body).forEach(x=>x.classList.toggle('is-active',x===btn));renderAuthForm(btn.dataset.authTab);});});
      renderAuthForm(wanted);return;
    }
    const social=window.C3K_SOCIAL_PROFILE;const identity=social?.profileIdentityHtml?.(profile,'lg')||'';const roleBadge=social?.roleBadgeHtml?.(profile.role,profile.member_label)||`<span class="c3k-v8-role">${esc(roleLabel(profile.role))}</span>`;
    body.innerHTML=`${identity}<dl class="c3k-v8-profile-grid"><dt>Prénom</dt><dd>${esc(profile.first_name||'—')}</dd><dt>Pseudo</dt><dd>${esc(profile.username||'—')}</dd><dt>E-mail</dt><dd>${esc(profile.email||session.user?.email||'—')}</dd><dt>Rôle</dt><dd>${roleBadge}</dd>${profile.status_text?`<dt>Statut</dt><dd><span class="c3k-status-bubble">${esc(profile.status_text)}</span></dd>`:''}</dl><div style="margin-top:12px"><span class="c3k-v8-sync-pill">☁ Favoris synchronisés avec ce compte</span></div><div class="c3k-v8-menu"><button id="c3kV8EditProfile" type="button"><span>Modifier mon profil</span><span>›</span></button><button id="c3kV8ShortcutPrefs" type="button"><span>Raccourcis favoris</span><span>★</span></button><button id="c3kV8SyncNow" type="button"><span>Synchroniser maintenant</span><span>↻</span></button>${isAdmin()?'<button id="c3kV8Admin" type="button"><span>Registre administrateur</span><span>🛠</span></button>':''}<button id="c3kV8Logout" type="button"><span>Se déconnecter</span><span>↪</span></button></div>`;
    qs('#c3kV8EditProfile',body)?.addEventListener('click',renderProfileEditor);
    qs('#c3kV8ShortcutPrefs',body)?.addEventListener('click',renderShortcutPreferences);
    qs('#c3kV8SyncNow',body)?.addEventListener('click',async()=>{await syncAccountData(true);renderAccount();});
    qs('#c3kV8Admin',body)?.addEventListener('click',renderAdmin);
    qs('#c3kV8Logout',body)?.addEventListener('click',async()=>{await client.auth.signOut();closeAccount();});
  }
  function renderAuthForm(mode){
    const area=qs('#c3kV8AuthArea');if(!area)return;
    if(mode==='signup')area.innerHTML=`<form class="c3k-v8-form" id="c3kV8SignupForm"><label>Prénom<input name="first_name" required maxlength="80" autocomplete="given-name"></label><label>Pseudo<input name="username" required minlength="2" maxlength="40" autocomplete="nickname"></label><label>E-mail<input name="email" required type="email" autocomplete="email"></label><label>Mot de passe<input name="password" required type="password" minlength="8" autocomplete="new-password"></label><button class="c3k-v8-primary" type="submit">Créer mon compte</button></form><div class="c3k-v8-status" id="c3kV8AuthStatus" hidden></div>`;
    else area.innerHTML=`<form class="c3k-v8-form" id="c3kV8LoginForm"><label>E-mail<input name="email" required type="email" autocomplete="email"></label><label>Mot de passe<input name="password" required type="password" autocomplete="current-password"></label><button class="c3k-v8-primary" type="submit">Se connecter</button></form><div class="c3k-v8-status" id="c3kV8AuthStatus" hidden></div>`;
    qs('#c3kV8SignupForm')?.addEventListener('submit',signup);qs('#c3kV8LoginForm')?.addEventListener('submit',login);
  }
  async function signup(e){e.preventDefault();const fd=new FormData(e.currentTarget),st=qs('#c3kV8AuthStatus');const first_name=String(fd.get('first_name')||'').trim(),username=String(fd.get('username')||'').trim(),email=String(fd.get('email')||'').trim(),password=String(fd.get('password')||'');toast(st,'Création du compte…');const {data,error}=await client.auth.signUp({email,password,options:{emailRedirectTo:PRODUCTION_URL,data:{first_name,username}}});if(error){toast(st,error.message,'error');return;}e.currentTarget.reset();scrubAuthPasswords();if(data.session)toast(st,'Compte créé et connecté.','ok');else toast(st,'Confirme la création de ton compte en cliquant sur le lien reçu par e-mail.','ok');}
  async function login(e){e.preventDefault();const form=e.currentTarget,fd=new FormData(form),st=qs('#c3kV8AuthStatus');toast(st,'Connexion…');const {error}=await client.auth.signInWithPassword({email:String(fd.get('email')||'').trim(),password:String(fd.get('password')||'')});if(error){toast(st,error.message,'error');return;}form.reset();scrubAuthPasswords();}

  async function refreshHeaderAction(){
    const btn=qs('#c3kV8NotifyBtn'),countBadge=qs('#c3kV8NotifyCount'),icon=qs('#c3kV8HeaderActionIcon');if(!btn||!countBadge||!icon)return;const actions=btn.parentElement;
    const setIcon=name=>{icon.dataset.c3kIcon=name;delete icon.dataset.c3kIconHydrated;window.C3K_UI?.hydrate?.(icon.parentElement||document);};
    if(!session?.user||!profile){btn.hidden=true;countBadge.hidden=true;actions?.classList.remove('has-notify');return;}
    btn.hidden=false;actions?.classList.add('has-notify');
    if(!isAdmin()){setIcon('flag');countBadge.hidden=true;btn.title='Faire un signalement';btn.setAttribute('aria-label',btn.title);return;}
    setIcon('bell');
    const reportReq=client.from('reports').select('id',{count:'exact',head:true}).in('status',['new','in_progress']);
    const clientReq=profile?.role==='superadmin'?client.from('client_contact_suggestions').select('id',{count:'exact',head:true}).eq('status','new'):Promise.resolve({count:0,error:null});
    const [{count:reportCount,error:reportError},{count:clientCount,error:clientError}]=await Promise.all([reportReq,clientReq]);
    if(reportError){countBadge.hidden=true;btn.title='Notifications administrateur';btn.setAttribute('aria-label',btn.title);return;}
    const reportsPending=Number(reportCount||0),clientsPending=clientError?0:Number(clientCount||0),pending=reportsPending+clientsPending;
    countBadge.hidden=pending===0;countBadge.textContent=pending>99?'99+':String(pending);
    if(!pending)btn.title='Aucun signalement non traité';
    else if(profile?.role==='superadmin'&&clientsPending)btn.title=`${reportsPending} signalement${reportsPending>1?'s':''} · ${clientsPending} nouveau${clientsPending>1?'x':''} contact${clientsPending>1?'s':''}`;
    else btn.title=`${reportsPending} signalement${reportsPending>1?'s':''} non traité${reportsPending>1?'s':''}`;
    btn.setAttribute('aria-label',btn.title);
  }
  async function loadProfile(){
    profile=null;
    if(!session?.user){updateAccountHeader();await refreshHeaderAction();window.C3K_ACCOUNT_STATE={session:null,profile:null,role:'guest'};window.dispatchEvent(new CustomEvent('c3k:account-state',{detail:window.C3K_ACCOUNT_STATE}));return;}
    const [{data,error},{data:memberLabel,error:labelError}]=await Promise.all([
      client.from('profiles').select('id,first_name,username,email,role,last_seen_at,avatar_kind,avatar_key,avatar_url,status_text').eq('id',session.user.id).maybeSingle(),
      client.from('member_role_labels').select('user_id,label_text,icon_text,appearance,color_start,color_end,gradient_angle').eq('user_id',session.user.id).maybeSingle()
    ]);
    if(!error)profile=data?{...data,member_label:labelError?null:(memberLabel||null)}:data;
    updateAccountHeader();await refreshHeaderAction();window.C3K_ACCOUNT_STATE={session,profile,role:profile?.role||'guest'};window.dispatchEvent(new CustomEvent('c3k:account-state',{detail:window.C3K_ACCOUNT_STATE}));
  }
  function updateAccountHeader(){const label=qs('#c3kV8AccountLabel'),signup=qs('#c3kV8SignupShortcut');if(profile){label.textContent=profile.username||profile.first_name||'Mon compte';if(signup){signup.hidden=false;signup.textContent='Se déconnecter';signup.setAttribute('aria-label','Se déconnecter du compte Cotation 3000');}}else{if(label)label.textContent='Se connecter';if(signup){signup.hidden=false;signup.textContent='Créer un compte';signup.setAttribute('aria-label','Créer un compte Cotation 3000');}}}
  function renderProfileEditor(){
    const body=qs('#c3kV8PanelBody');
    body.innerHTML=`<form class="c3k-v8-form" id="c3kV8ProfileForm"><label>Prénom<input name="first_name" maxlength="80" required value="${esc(profile.first_name||'')}"></label><label>Pseudo<input name="username" minlength="2" maxlength="40" required value="${esc(profile.username||'')}"></label><label>E-mail<input value="${esc(profile.email||'')}" disabled><span class="c3k-v8-muted">L'e-mail d'authentification ne se modifie pas ici.</span></label><div class="c3k-v8-actions"><button class="c3k-v8-secondary" id="c3kV8ProfileBack" type="button">Retour</button><button class="c3k-v8-primary" type="submit">Enregistrer</button></div></form><div class="c3k-v8-status" id="c3kV8ProfileStatus" hidden></div>`;
    window.C3K_SOCIAL_PROFILE?.enhanceProfileEditor?.(body,profile);
    qs('#c3kV8ProfileBack')?.addEventListener('click',renderAccount);
    qs('#c3kV8ProfileForm')?.addEventListener('submit',async e=>{
      e.preventDefault();const fd=new FormData(e.currentTarget),st=qs('#c3kV8ProfileStatus');
      const payload={first_name:String(fd.get('first_name')||'').trim(),username:String(fd.get('username')||'').trim(),status_text:String(fd.get('status_text')||'').trim()||null,avatar_kind:'base',avatar_key:String(fd.get('avatar_key')||'avatar-01'),avatar_url:null};
      const {error}=await client.from('profiles').update(payload).eq('id',session.user.id);if(error){toast(st,error.message,'error');return;}
      await loadProfile();await setupPresence();toast(st,'Profil enregistré.','ok');setTimeout(renderAccount,450);
    });
  }

  async function renderShortcutPreferences(){
    const body=qs('#c3kV8PanelBody');if(!body||!session?.user)return;
    body.innerHTML='<div class="c3k-v8-muted">Chargement de tes raccourcis…</div>';
    const fallback=[
      ['annuaire','Annuaire clients'],['tva','TVA intracommunautaire'],['carburant','Surcharges carburant'],['adr','ADR / IMDG'],['ports-monde','Ports mondiaux'],['maritime','Compagnies & navires'],['douane','Douane / ICS2 / NCTS'],['trm','Référentiel TRM'],['lexique','Lexique transport'],['comptes-tva','Comptes TVA'],['lieux-portuaires','Lieux portuaires'],['iso-conteneurs','ISO conteneurs'],['attente','Frais d’attente'],['stationnement','Stationnement conteneur'],['poids-attelage','Poids d’attelage'],['historique-cotations','Historique cotations']
    ].map(([key,label])=>({key,label}));
    const options=(window.C3K_PROFILE_SHORTCUTS?.options||fallback).map(x=>({key:String(x.key),label:String(x.label)}));
    const {data,error}=await client.from('user_preferences').select('settings').eq('user_id',session.user.id).maybeSingle();
    if(error){body.innerHTML=`<div class="c3k-v8-status is-error">${esc(error.message)}</div><div class="c3k-v8-actions"><button class="c3k-v8-secondary" id="c3kV8ShortcutBack" type="button">Retour</button></div>`;qs('#c3kV8ShortcutBack',body)?.addEventListener('click',renderAccount);return;}
    const settings=data?.settings&&typeof data.settings==='object'?data.settings:{};
    const clean=window.C3K_PROFILE_SHORTCUTS?.cleanValues||((v)=>Array.isArray(v)?v.slice(0,3):[]);
    const current=clean(settings.profile_shortcuts||window.C3K_PROFILE_SHORTCUTS?.getSelected?.()||[]);
    const optionHtml=(value)=>`<option value="">Aucun</option>${options.map(o=>`<option value="${esc(o.key)}" ${o.key===value?'selected':''}>${esc(o.label)}</option>`).join('')}`;
    body.innerHTML=`<div class="c3k-shortcut-pref-intro"><strong>★ Raccourcis favoris</strong><br>Choisis jusqu’à trois outils. Ils resteront aussi disponibles à leur emplacement normal et apparaîtront en plus grand sous la barre d’outils lorsque tu es connecté.</div><form class="c3k-v8-form" id="c3kV8ShortcutForm"><div class="c3k-shortcut-pref-grid"><label>Favori 1<select name="shortcut_1">${optionHtml(current[0]||'')}</select></label><label>Favori 2<select name="shortcut_2">${optionHtml(current[1]||'')}</select></label><label>Favori 3<select name="shortcut_3">${optionHtml(current[2]||'')}</select></label></div><div class="c3k-v8-actions"><button class="c3k-v8-secondary" id="c3kV8ShortcutBack" type="button">Retour</button><button class="c3k-v8-primary" type="submit">Enregistrer</button></div></form><div class="c3k-v8-status" id="c3kV8ShortcutStatus" hidden></div>`;
    const form=qs('#c3kV8ShortcutForm',body),selects=qsa('select',form);
    const refreshDisabled=()=>{const picked=selects.map(s=>s.value).filter(Boolean);selects.forEach(sel=>qsa('option',sel).forEach(opt=>{opt.disabled=!!opt.value&&opt.value!==sel.value&&picked.includes(opt.value);}));};
    selects.forEach(sel=>sel.addEventListener('change',refreshDisabled));refreshDisabled();
    qs('#c3kV8ShortcutBack',body)?.addEventListener('click',renderAccount);
    form?.addEventListener('submit',async e=>{
      e.preventDefault();const st=qs('#c3kV8ShortcutStatus',body);const values=selects.map(s=>s.value).filter(Boolean);
      if(new Set(values).size!==values.length){toast(st,'Chaque raccourci doit être différent.','error');return;}
      const nextSettings={...settings,profile_shortcuts:values};
      const {error:saveError}=await client.from('user_preferences').upsert({user_id:session.user.id,settings:nextSettings},{onConflict:'user_id'});
      if(saveError){toast(st,saveError.message,'error');return;}
      window.C3K_PROFILE_SHORTCUTS?.setCache?.(values,session.user.id);
      window.dispatchEvent(new CustomEvent('c3k:profile-shortcuts-changed',{detail:{userId:session.user.id,values}}));
      toast(st,'Raccourcis enregistrés.','ok');setTimeout(renderAccount,450);
    });
  }

  async function syncAccountData(showMessage=false){
    if(!session?.user)return;const uid=session.user.id;let localFav=[],localOrder=[];try{localFav=JSON.parse(localStorage.getItem(FAVORITES_KEY)||'[]');if(!Array.isArray(localFav))localFav=[];}catch{}try{localOrder=JSON.parse(localStorage.getItem(FAVORITES_ORDER_KEY)||'[]');if(!Array.isArray(localOrder))localOrder=[];}catch{}
    const {data:cloudFav}=await client.from('favorites').select('item_key,position').eq('user_id',uid).eq('item_type','commune').order('position',{ascending:true});const merged=[...new Set([...(cloudFav||[]).map(x=>x.item_key),...localOrder,...localFav])];nativeSetItem.call(localStorage,FAVORITES_KEY,JSON.stringify(merged));nativeSetItem.call(localStorage,FAVORITES_ORDER_KEY,JSON.stringify(merged));if(merged.length){await client.from('favorites').upsert(merged.map((key,i)=>({user_id:uid,item_type:'commune',item_key:key,position:i,payload:{}})),{onConflict:'user_id,item_type,item_key'});}
    const settings={};for(const k of SYNC_KEYS){const v=localStorage.getItem(k);if(v!==null)settings[k]=v;}const {data:cloudPrefs}=await client.from('user_preferences').select('settings').eq('user_id',uid).maybeSingle();const cloud=cloudPrefs?.settings&&typeof cloudPrefs.settings==='object'?cloudPrefs.settings:{};const mergedSettings={...cloud,...settings};Object.entries(mergedSettings).forEach(([k,v])=>{if(SYNC_KEYS.includes(k)&&v!==null&&v!==undefined)nativeSetItem.call(localStorage,k,String(v));});await client.from('user_preferences').upsert({user_id:uid,settings:mergedSettings},{onConflict:'user_id'});window.dispatchEvent(new CustomEvent('c3k:favorites-synced'));if(showMessage)alert('Synchronisation Cotation 3000 terminée.');
  }
  async function pushSyncSoon(){clearTimeout(syncTimer);syncTimer=setTimeout(()=>syncAccountData(false).catch(()=>{}),700);}
  Storage.prototype.setItem=function(key,value){nativeSetItem.call(this,key,value);if(this===localStorage&&(key===FAVORITES_KEY||key===FAVORITES_ORDER_KEY||SYNC_KEYS.includes(key)))pushSyncSoon();};
  Storage.prototype.removeItem=function(key){nativeRemoveItem.call(this,key);if(this===localStorage&&(key===FAVORITES_KEY||key===FAVORITES_ORDER_KEY||SYNC_KEYS.includes(key)))pushSyncSoon();};

  async function sendReport(){const st=qs('#c3kV8ReportStatus'),msg=String(qs('#c3kV8ReportMessage')?.value||'').trim();if(!session?.user){toast(st,'Connecte-toi pour envoyer ce signalement.','error');return;}if(!msg){toast(st,'Écris simplement une courte information.','error');return;}const activeModal=[...document.querySelectorAll('[role="dialog"]')].find(x=>!x.hidden&&x.offsetParent!==null);const context={version:'V9.0.0',page:location.pathname||'local',search:qs('#universalSearchInput')?.value||'',active_dialog:activeModal?.getAttribute('aria-label')||activeModal?.querySelector('h2,strong')?.textContent?.trim()||'',report_label:reportLabel(reportType),user_agent:navigator.userAgent};const {error}=await client.from('reports').insert({user_id:session.user.id,report_type:reportType,message:msg,module:context.active_dialog||'interface',context});if(error){toast(st,error.message,'error');return;}qs('#c3kV8ReportMessage').value='';toast(st,'Signalement envoyé au registre administrateur.','ok');if(isAdmin())await refreshHeaderAction();setTimeout(()=>{qs('#c3kV8ReportPop').hidden=true;st.hidden=true;},900);}

  async function renderAdmin(){
    if(!isAdmin())return;
    const body=qs('#c3kV8PanelBody');body.innerHTML='<div class="c3k-v8-muted">Chargement du registre…</div>';
    const clientSuggestionReq=profile?.role==='superadmin'?client.from('client_contact_suggestions').select('id,company_name,contact_name,email,phone,mobile,source_quote,reported_by,reported_role,status,occurrences,first_seen_at,last_seen_at').eq('status','new').order('last_seen_at',{ascending:false}).limit(100):Promise.resolve({data:[],error:null});
    const [{data:reports,error:rerr},{data:users,error:uerr},{data:changes,error:cerr},{data:clientSuggestions,error:serr},{data:memberLabelRows,error:lerr}]=await Promise.all([
      client.from('reports').select('id,report_type,status,message,module,context,created_at,user_id').order('created_at',{ascending:false}).limit(100),
      client.from('profiles').select('id,first_name,username,email,role,last_seen_at,created_at,avatar_kind,avatar_key,avatar_url,status_text').order('created_at',{ascending:true}),
      client.from('data_change_log').select('id,actor_user_id,entity_type,entity_id,action,before_data,after_data,created_at').order('created_at',{ascending:false}).limit(120),
      clientSuggestionReq,
      client.from('member_role_labels').select('user_id,label_text,icon_text,appearance,color_start,color_end,gradient_angle,updated_at').order('updated_at',{ascending:false})
    ]);
    if(rerr||uerr||cerr){body.innerHTML=`<div class="c3k-v8-status is-error">${esc(rerr?.message||uerr?.message||cerr?.message||'Erreur')}</div>`;return;}
    const suggestions=serr?[]:(clientSuggestions||[]),memberLabels=lerr?[]:[...(memberLabelRows||[])];
    const nameById=new Map((users||[]).map(u=>[u.id,u.username||u.first_name||u.email]));
    const clientTab=profile?.role==='superadmin'?`<button data-admin-tab="clients">Annuaire (${suggestions.length})</button>`:'';
    body.innerHTML=`<div class="c3k-v8-tabs"><button class="is-active" data-admin-tab="reports">Signalements (${reports?.length||0})</button>${clientTab}<button data-admin-tab="changes">Modifications BDD (${changes?.length||0})</button><button data-admin-tab="users">Comptes (${users?.length||0})</button></div><div id="c3kV8AdminArea"></div><div class="c3k-v8-actions"><button class="c3k-v8-secondary" id="c3kV8AdminBack" type="button">Retour au profil</button></div>`;
    const area=qs('#c3kV8AdminArea',body);
    const drawReports=()=>{area.innerHTML=`<div class="c3k-v8-admin-list">${(reports||[]).map(r=>`<article class="c3k-v8-admin-item"><div class="c3k-v8-admin-meta"><span>${esc(reportLabel(r.report_type))}</span><span>${esc(nameById.get(r.user_id)||'Utilisateur')}</span><span>${new Date(r.created_at).toLocaleString('fr-FR')}</span></div><p>${esc(r.message)}</p><div style="display:flex;gap:7px;align-items:center"><select data-report-status="${r.id}"><option value="new" ${r.status==='new'?'selected':''}>Nouveau</option><option value="in_progress" ${r.status==='in_progress'?'selected':''}>En cours</option><option value="resolved" ${r.status==='resolved'?'selected':''}>Corrigé</option><option value="rejected" ${r.status==='rejected'?'selected':''}>Refusé</option></select><span class="c3k-v8-muted">${esc(r.module||'')}</span></div></article>`).join('')||'<div class="c3k-v8-muted">Aucun signalement.</div>'}</div>`;qsa('[data-report-status]',area).forEach(sel=>sel.addEventListener('change',async()=>{const status=sel.value;const {error}=await client.from('reports').update({status,resolved_at:['resolved','rejected'].includes(status)?new Date().toISOString():null}).eq('id',sel.dataset.reportStatus);if(error){alert(error.message);return;}const row=(reports||[]).find(r=>String(r.id)===String(sel.dataset.reportStatus));if(row)row.status=status;await refreshHeaderAction();}));};
    const drawClientSuggestions=()=>{area.innerHTML=`<div class="c3k-v8-admin-list">${suggestions.map(s=>`<article class="c3k-v8-admin-item" data-client-suggestion="${esc(s.id)}"><div class="c3k-v8-admin-meta"><span>👤 Nouveau contact</span><span>${esc(nameById.get(s.reported_by)||roleLabel(s.reported_role))}</span><span>${new Date(s.last_seen_at).toLocaleString('fr-FR')}</span>${s.occurrences>1?`<span>${s.occurrences} détections</span>`:''}</div><p><strong>${esc(s.contact_name||s.email||'Contact')}</strong>${s.company_name?` · ${esc(s.company_name)}`:''}</p><div class="c3k-v8-muted">${esc([s.email,s.phone,s.mobile].filter(Boolean).join(' · ')||'Aucune coordonnée complémentaire')}</div><div class="c3k-v8-admin-client-actions"><button class="is-approve" type="button" data-client-suggestion-approve="${esc(s.id)}">Ajouter à l’annuaire</button><button type="button" data-client-suggestion-ignore="${esc(s.id)}">Ignorer</button></div></article>`).join('')||'<div class="c3k-v8-muted">Aucun nouveau contact détecté.</div>'}</div>`;
      qsa('[data-client-suggestion-approve]',area).forEach(btn=>btn.addEventListener('click',async()=>{const row=suggestions.find(x=>String(x.id)===String(btn.dataset.clientSuggestionApprove));if(!row)return;btn.disabled=true;try{const dir=window.C3K_CLIENT_DIRECTORY;if(!dir)throw new Error('Module Annuaire indisponible.');await dir.approveSuggestion(row);suggestions.splice(suggestions.indexOf(row),1);drawClientSuggestions();await refreshHeaderAction();}catch(err){alert(err?.message||String(err));btn.disabled=false;}}));
      qsa('[data-client-suggestion-ignore]',area).forEach(btn=>btn.addEventListener('click',async()=>{const row=suggestions.find(x=>String(x.id)===String(btn.dataset.clientSuggestionIgnore));if(!row)return;const dir=window.C3K_CLIENT_DIRECTORY;if(dir)await dir.ignoreSuggestion(row.id);else await client.from('client_contact_suggestions').update({status:'ignored',resolved_by:session.user.id,resolved_at:new Date().toISOString()}).eq('id',row.id);suggestions.splice(suggestions.indexOf(row),1);drawClientSuggestions();await refreshHeaderAction();}));
    };
    const drawChanges=()=>{area.innerHTML=`<div class="c3k-v8-admin-list">${(changes||[]).map(c=>{const parts=String(c.entity_type||'').split(':');const ref=parts[1]||'référentiel',collection=parts[2]||'';const actionLabel={insert:'Ajout',update:'Modification',delete:'Suppression'}[c.action]||c.action;return `<article class="c3k-v8-admin-item"><div class="c3k-v8-admin-meta"><span>${esc(actionLabel)}</span><span>${esc(ref)}${collection?' · '+esc(collection):''}</span><span>${esc(nameById.get(c.actor_user_id)||'Administrateur')}</span><span>${new Date(c.created_at).toLocaleString('fr-FR')}</span></div><p><strong>${esc(c.entity_id||'Entrée')}</strong></p></article>`;}).join('')||'<div class="c3k-v8-muted">Aucune modification enregistrée.</div>'}</div>`;};
    const social=window.C3K_SOCIAL_PROFILE;
    const labelByUser=userId=>memberLabels.find(x=>String(x.user_id)===String(userId))||null;
    const fallbackEditableLabel=u=>social?.defaultMemberLabel?.(u.role)||{label_text:roleLabel(u.role),icon_text:'★',appearance:'gradient',color_start:'#F4F0E5',color_end:'#B9AA84',gradient_angle:135};
    const syncLabelLocally=(userId,row)=>{const idx=memberLabels.findIndex(x=>String(x.user_id)===String(userId));if(row){if(idx>=0)memberLabels[idx]=row;else memberLabels.push(row);}else if(idx>=0)memberLabels.splice(idx,1);social?.setMemberLabel?.(userId,row);social?.refreshPresence?.();if(String(profile?.id)===String(userId)){profile.member_label=row||null;window.C3K_ACCOUNT_STATE={...(window.C3K_ACCOUNT_STATE||{}),profile,role:profile?.role||'guest'};window.dispatchEvent(new CustomEvent('c3k:account-state',{detail:window.C3K_ACCOUNT_STATE}));}};
    const drawMemberLabelEditor=u=>{
      if(profile?.role!=='superadmin')return;
      const saved=labelByUser(u.id),current=saved||fallbackEditableLabel(u),presets=social?.memberLabelPresets||[],icons=social?.memberLabelIconPresets||['♛','★','◆','⚡','🛡️','🚚','⚓','🧭','📦','💎'];
      area.innerHTML=`<section class="c3k-member-label-editor"><div class="c3k-member-label-editor-head">${social?.avatarHtml?.(u,'md')||''}<div class="c3k-member-label-editor-head-copy"><strong>${esc(u.username||u.first_name||'Compte')}</strong><small>${esc(u.email||'')} · rôle technique ${esc(roleLabel(u.role))}</small></div></div><div class="c3k-member-label-technical"><b>Important :</b><span>cette étiquette est uniquement visuelle et ne modifie jamais les permissions du compte.</span></div><div class="c3k-member-label-preview"><small>Aperçu</small><div id="c3kMemberLabelPreview"></div></div><form class="c3k-v8-form" id="c3kMemberLabelForm"><label>Intitulé de l’étiquette<input name="label_text" maxlength="32" required value="${esc(current.label_text||roleLabel(u.role))}" placeholder="Ex. PREMIUM, EXPLOITATION…"></label><label>Icône / emoji<input name="icon_text" maxlength="12" required value="${esc(current.icon_text||'★')}" placeholder="★"></label><div class="c3k-member-label-icons">${icons.map(icon=>`<button type="button" data-member-label-icon="${esc(icon)}" title="Utiliser ${esc(icon)}">${esc(icon)}</button>`).join('')}</div><label>Style<select name="appearance"><option value="gradient" ${current.appearance!=='solid'?'selected':''}>Dégradé</option><option value="solid" ${current.appearance==='solid'?'selected':''}>Couleur unie</option></select></label><div class="c3k-member-label-colors"><label>Couleur A<input name="color_start" type="color" value="${esc(current.color_start||'#85754E')}"></label><label>Couleur B<input name="color_end" type="color" value="${esc(current.color_end||current.color_start||'#85754E')}"></label></div><label>Orientation du dégradé<select name="gradient_angle">${[90,120,135,160,180].map(a=>`<option value="${a}" ${Number(current.gradient_angle||135)===a?'selected':''}>${a}°</option>`).join('')}</select></label><div><span class="c3k-v8-muted">Variations proposées</span><div class="c3k-member-label-presets">${presets.map((p,i)=>`<button class="c3k-member-label-preset ${p.appearance==='solid'?'is-solid':''}" type="button" data-member-label-preset="${i}" style="--p1:${esc(p.color_start)};--p2:${esc(p.color_end)};--pangle:${Number(p.gradient_angle)||135}deg"><span class="c3k-member-label-preset-swatch"></span><span>${esc(p.name)}</span></button>`).join('')}</div></div><div class="c3k-member-label-editor-actions">${saved?'<button type="button" class="c3k-member-label-reset" id="c3kMemberLabelReset">Réinitialiser</button>':''}<span class="spacer"></span><button type="button" class="c3k-v8-secondary" id="c3kMemberLabelBack">Retour</button><button type="submit" class="c3k-v8-primary">Enregistrer</button></div></form><div class="c3k-v8-status" id="c3kMemberLabelStatus" hidden></div></section>`;
      const form=qs('#c3kMemberLabelForm',area),preview=qs('#c3kMemberLabelPreview',area),status=qs('#c3kMemberLabelStatus',area);
      const draft=()=>{const fd=new FormData(form);return {user_id:u.id,label_text:String(fd.get('label_text')||'').trim(),icon_text:String(fd.get('icon_text')||'★').trim()||'★',appearance:fd.get('appearance')==='solid'?'solid':'gradient',color_start:String(fd.get('color_start')||'#85754E'),color_end:String(fd.get('color_end')||fd.get('color_start')||'#85754E'),gradient_angle:Number(fd.get('gradient_angle'))||135};};
      const refreshPreview=()=>{const row=draft();preview.innerHTML=social?.memberLabelBadgeHtml?.(row,u.role)||`<span class="c3k-v8-role">${esc(row.label_text)}</span>`;};
      form.addEventListener('input',refreshPreview);form.addEventListener('change',refreshPreview);
      qsa('[data-member-label-icon]',area).forEach(btn=>btn.addEventListener('click',()=>{form.elements.icon_text.value=btn.dataset.memberLabelIcon||'★';refreshPreview();}));
      qsa('[data-member-label-preset]',area).forEach(btn=>btn.addEventListener('click',()=>{const p=presets[Number(btn.dataset.memberLabelPreset)];if(!p)return;form.elements.appearance.value=p.appearance;form.elements.color_start.value=p.color_start;form.elements.color_end.value=p.color_end;form.elements.gradient_angle.value=String(p.gradient_angle||135);refreshPreview();}));
      qs('#c3kMemberLabelBack',area)?.addEventListener('click',drawUsers);
      qs('#c3kMemberLabelReset',area)?.addEventListener('click',async()=>{if(!confirm(`Réinitialiser l’étiquette de ${u.username||u.first_name||'ce membre'} ?`))return;toast(status,'Réinitialisation…');const {error}=await client.from('member_role_labels').delete().eq('user_id',u.id);if(error){toast(status,error.message,'error');return;}syncLabelLocally(u.id,null);drawUsers();});
      form.addEventListener('submit',async e=>{e.preventDefault();const row=draft();if(!row.label_text){toast(status,'Indique un intitulé.','error');return;}toast(status,'Enregistrement…');const payload={...row,updated_by:session.user.id};const {data,error}=await client.from('member_role_labels').upsert(payload,{onConflict:'user_id'}).select('user_id,label_text,icon_text,appearance,color_start,color_end,gradient_angle,updated_at').single();if(error){toast(status,error.message,'error');return;}syncLabelLocally(u.id,data);toast(status,'Étiquette enregistrée.','ok');setTimeout(drawUsers,350);});
      refreshPreview();
    };
    const drawUsers=()=>{
      const roleChoicesFor=u=>profile?.role==='superadmin'?['user','contributor','editor','admin','superadmin']:['user','contributor','editor'];
      const canEditRole=u=>u.id!==session.user.id && (profile?.role==='superadmin' || (profile?.role==='admin'&&!['admin','superadmin'].includes(u.role)));
      const canEditLabel=profile?.role==='superadmin';
      area.innerHTML=`<div class="c3k-v8-admin-list">${(users||[]).map(u=>{const label=labelByUser(u.id),badge=social?.roleBadgeHtml?.(u.role,label)||`<span class="c3k-v8-role">${esc(roleLabel(u.role))}</span>`;const roleControl=canEditRole(u)?`<select data-user-role="${u.id}" aria-label="Rôle technique de ${esc(u.username||u.first_name||'ce membre')}">${roleChoicesFor(u).map(r=>`<option value="${r}" ${u.role===r?'selected':''}>${roleLabel(r)}</option>`).join('')}</select>`:`<span class="c3k-v8-role" title="Rôle technique">${esc(roleLabel(u.role))}</span>`;return `<div class="c3k-v8-admin-user">${social?.avatarHtml?.(u,'md')||''}<div class="c3k-v8-admin-user-main"><strong>${esc(u.username||u.first_name||'Compte')} ${badge}</strong><small>${esc(u.first_name||'')} · ${esc(u.email||'')}</small>${u.status_text?`<div class="c3k-v8-admin-user-status"><span class="c3k-status-bubble">${esc(u.status_text)}</span></div>`:''}</div><div class="c3k-v8-admin-user-tools">${roleControl}${canEditLabel?`<button class="c3k-v8-label-edit-btn" type="button" data-user-label-edit="${u.id}">🏷 Étiquette</button>`:''}</div></div>`;}).join('')}</div>`;
      qsa('[data-user-role]',area).forEach(sel=>sel.addEventListener('change',async()=>{const row=(users||[]).find(u=>String(u.id)===String(sel.dataset.userRole));const previous=row?.role||'user';const {error}=await client.from('profiles').update({role:sel.value}).eq('id',sel.dataset.userRole);if(error){sel.value=previous;alert(error.message);return;}if(row)row.role=sel.value;drawUsers();}));
      qsa('[data-user-label-edit]',area).forEach(btn=>btn.addEventListener('click',()=>{const row=(users||[]).find(u=>String(u.id)===String(btn.dataset.userLabelEdit));if(row)drawMemberLabelEditor(row);}));
    };
    for(const row of memberLabels)social?.setMemberLabel?.(row.user_id,row);
    drawReports();qsa('[data-admin-tab]',body).forEach(btn=>btn.addEventListener('click',()=>{qsa('[data-admin-tab]',body).forEach(x=>x.classList.toggle('is-active',x===btn));const tab=btn.dataset.adminTab;tab==='users'?drawUsers():tab==='changes'?drawChanges():tab==='clients'?drawClientSuggestions():drawReports();}));qs('#c3kV8AdminBack',body)?.addEventListener('click',renderAccount);
  }
  async function setupPresence(){
    try{if(presenceChannel)await client.removeChannel(presenceChannel);}catch{}
    let guestKey=localStorage.getItem('cotation3000.presence.guest.v1');if(!guestKey){guestKey=crypto.randomUUID?.()||Math.random().toString(36).slice(2);nativeSetItem.call(localStorage,'cotation3000.presence.guest.v1',guestKey);}
    const key=session?.user?.id||`guest:${guestKey}`;
    presenceChannel=client.channel('c3k-online',{config:{presence:{key}}});
    presenceChannel.on('presence',{event:'sync'},()=>{
      const state=presenceChannel.presenceState();window.C3K_PRESENCE_STATE=state||{};
      const count=Object.keys(state||{}).length;qsa('[data-c3k-online-count]').forEach(n=>{n.textContent=`${count} connecté${count>1?'s':''}`;});
      window.dispatchEvent(new CustomEvent('c3k:presence-state',{detail:{state:window.C3K_PRESENCE_STATE,count}}));
    });
    presenceChannel.subscribe(async status=>{if(status==='SUBSCRIBED'){await presenceChannel.track({user_id:session?.user?.id||null,pseudo:profile?.username||null,first_name:profile?.first_name||null,role:profile?.role||'guest',avatar_kind:profile?.avatar_kind||'base',avatar_key:profile?.avatar_key||'avatar-01',avatar_url:profile?.avatar_url||null,status_text:profile?.status_text||null,online_at:new Date().toISOString()});}});
  }
  async function touchPresence(){if(session?.user)client.from('profiles').update({last_seen_at:new Date().toISOString()}).eq('id',session.user.id).then(()=>{}).catch(()=>{});}
  async function handleSession(next){session=next;await loadProfile();await setupPresence();if(session?.user){scrubAuthPasswords();await syncAccountData(false);}updateAccountHeader();if(!qs('#c3kV8AccountBackdrop')?.hidden)renderAccount();touchPresence();}
  async function init(){buildUi();if(!window.supabase?.createClient){qs('#c3kV8AccountLabel').textContent='Compte indisponible';return;}client=window.supabase.createClient(SUPABASE_URL,SUPABASE_KEY,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});window.COTATION3000_SUPABASE=client;const {data}=await client.auth.getSession();await handleSession(data.session||null);client.auth.onAuthStateChange((_event,next)=>{setTimeout(()=>handleSession(next).catch(()=>{}),0);});setInterval(touchPresence,60000);setInterval(()=>{if(isAdmin())refreshHeaderAction().catch(()=>{});},30000);}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
