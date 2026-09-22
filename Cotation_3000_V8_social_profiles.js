/* Cotation 3000 V9.0.1.2.5 — Cotation_3000_V8_social_profiles.js */
(() => {
  'use strict';
  const AVATAR_BUCKET='c3k-profile-avatars';
  const MAX_FILE_SIZE=2*1024*1024;
  const MEMBER_LABEL_PRESETS=[
    {key:'premium',name:'Or Premium',appearance:'gradient',color_start:'#FFF7CF',color_end:'#D6B65A',gradient_angle:135},
    {key:'champagne',name:'Champagne',appearance:'gradient',color_start:'#FFFDF4',color_end:'#C9B27B',gradient_angle:135},
    {key:'mint',name:'Menthe',appearance:'gradient',color_start:'#D8FFF1',color_end:'#66CDAA',gradient_angle:135},
    {key:'ocean',name:'Océan',appearance:'gradient',color_start:'#DDF6FF',color_end:'#2997B8',gradient_angle:135},
    {key:'blue',name:'Bleu',appearance:'gradient',color_start:'#E7EEFF',color_end:'#4C6FFF',gradient_angle:135},
    {key:'violet',name:'Violet',appearance:'gradient',color_start:'#F2E7FF',color_end:'#8B5CF6',gradient_angle:135},
    {key:'rose',name:'Rose',appearance:'gradient',color_start:'#FFE5F1',color_end:'#E85D9E',gradient_angle:135},
    {key:'red',name:'Rouge',appearance:'gradient',color_start:'#FFE7E4',color_end:'#D94A3A',gradient_angle:135},
    {key:'bronze',name:'Bronze',appearance:'gradient',color_start:'#F7E0C2',color_end:'#A96832',gradient_angle:135},
    {key:'graphite',name:'Graphite',appearance:'gradient',color_start:'#59616C',color_end:'#171A1F',gradient_angle:135},
    {key:'gold-solid',name:'Or uni',appearance:'solid',color_start:'#C7A34A',color_end:'#C7A34A',gradient_angle:135},
    {key:'teal-solid',name:'Canard uni',appearance:'solid',color_start:'#147D82',color_end:'#147D82',gradient_angle:135}
  ];
  const MEMBER_LABEL_ICON_PRESETS=['♛','★','◆','⚡','🛡️','🚚','⚓','🧭','📦','💎','🔧','🌟'];
  const memberLabelCache=new Map();
  let memberLabelLoadedAt=0;
  const baseAvatars=[
    {key:'avatar-01',src:'avatar-01-turquoise.webp',label:'Camion turquoise'},
    {key:'avatar-02',src:'avatar-02-rouge.webp',label:'Camion rouge'},
    {key:'avatar-03',src:'avatar-03-noir.webp',label:'Camion noir'},
    {key:'avatar-04',src:'avatar-04-dore.webp',label:'Camion doré'},
    {key:'avatar-05',src:'avatar-05-jaune.webp',label:'Camion jaune'},
    {key:'avatar-06',src:'avatar-06-blanc.webp',label:'Camion blanc'},
    {key:'avatar-07',src:'avatar-07-bleu-canard.webp',label:'Camion bleu canard'},
    {key:'avatar-08',src:'avatar-08-vert.webp',label:'Camion vert'},
    {key:'avatar-09',src:'avatar-09-bleu.webp',label:'Camion bleu'},
    {key:'avatar-10',src:'avatar-10-rose.webp',label:'Camion rose'},
    {key:'avatar-11',src:'avatar-11-neon-fusion.png',label:'Camion néon fusion'},
    {key:'avatar-12',src:'avatar-12-champagne-cuivre.png',label:'Camion champagne cuivre'},
    {key:'avatar-13',src:'avatar-13-galaxie-bleue.png',label:'Camion galaxie bleue'},
    {key:'avatar-14',src:'avatar-14-lime-cyan.png',label:'Camion lime cyan'},
    {key:'avatar-15',src:'avatar-15-inferno-noir.png',label:'Camion inferno noir'},
    {key:'avatar-16',src:'avatar-16-pastel-menthe.png',label:'Camion pastel menthe'},
    {key:'avatar-17',src:'avatar-17-pop-azur.png',label:'Camion pop azur'},
    {key:'avatar-18',src:'avatar-18-vert-lime.png',label:'Camion vert lime'},
    {key:'avatar-19',src:'avatar-19-nuit-indigo.png',label:'Camion nuit indigo'},
    {key:'avatar-20',src:'avatar-20-sunset-pop.png',label:'Camion sunset pop'}
  ];
  const esc=v=>String(v??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  const roleLabel=r=>({superadmin:'SUPERADMIN',admin:'ADMIN',editor:'EDITOR',contributor:'CONTRIBUTOR',user:'USER',guest:'VISITEUR'}[r]||String(r||'USER').toUpperCase());
  const safeHex=(v,fallback='#85754E')=>/^#[0-9a-f]{6}$/i.test(String(v||''))?String(v).toUpperCase():fallback;
  const luminance=hex=>{const h=safeHex(hex).slice(1),rgb=[0,2,4].map(i=>parseInt(h.slice(i,i+2),16)/255).map(v=>v<=.03928?v/12.92:Math.pow((v+.055)/1.055,2.4));return .2126*rgb[0]+.7152*rgb[1]+.0722*rgb[2];};
  const memberLabelInk=(a,b=a)=>((luminance(a)+luminance(b))/2)>.46?'#2B2415':'#FFFFFF';
  function defaultMemberLabel(role){
    if(role==='superadmin')return {label_text:'PREMIUM',icon_text:'♛',appearance:'gradient',color_start:'#FFF7CF',color_end:'#D6B65A',gradient_angle:135};
    if(role==='admin')return {label_text:'ADMIN+',icon_text:'◆',appearance:'gradient',color_start:'#F8FAFB',color_end:'#CCD4DB',gradient_angle:135};
    return null;
  }
  function normalizeMemberLabel(label){
    if(!label||!String(label.label_text||'').trim())return null;
    return {user_id:label.user_id||null,label_text:String(label.label_text).trim().slice(0,32),icon_text:String(label.icon_text||'★').slice(0,12),appearance:label.appearance==='solid'?'solid':'gradient',color_start:safeHex(label.color_start),color_end:safeHex(label.color_end,label.color_start||'#85754E'),gradient_angle:Math.max(0,Math.min(360,Number(label.gradient_angle)||135))};
  }
  function memberLabelBadgeHtml(label,role){
    const x=normalizeMemberLabel(label)||defaultMemberLabel(role);if(!x)return `<span class="c3k-v8-role">${esc(roleLabel(role))}</span>`;
    const c1=safeHex(x.color_start),c2=safeHex(x.color_end,c1),ink=memberLabelInk(c1,c2),angle=Math.max(0,Math.min(360,Number(x.gradient_angle)||135));
    const mode=x.appearance==='solid'?'is-solid':'is-gradient';
    return `<span class="c3k-member-label ${mode}" style="--member-label-c1:${c1};--member-label-c2:${c2};--member-label-ink:${ink};--member-label-angle:${angle}deg" title="Étiquette : ${esc(x.label_text)}"><span class="c3k-member-label-icon" aria-hidden="true">${esc(x.icon_text||'★')}</span><span>${esc(x.label_text)}</span></span>`;
  }
  async function refreshMemberLabels(force=false){
    const client=window.COTATION3000_SUPABASE,session=window.C3K_ACCOUNT_STATE?.session;if(!client||!session?.user){memberLabelCache.clear();memberLabelLoadedAt=0;return memberLabelCache;}
    if(!force&&Date.now()-memberLabelLoadedAt<15000)return memberLabelCache;
    const {data,error}=await client.from('member_role_labels').select('user_id,label_text,icon_text,appearance,color_start,color_end,gradient_angle');
    if(!error){memberLabelCache.clear();for(const row of data||[])memberLabelCache.set(String(row.user_id),normalizeMemberLabel(row));memberLabelLoadedAt=Date.now();}
    return memberLabelCache;
  }
  const getMemberLabel=userId=>userId?memberLabelCache.get(String(userId))||null:null;
  function setMemberLabel(userId,label){if(!userId)return;if(label)memberLabelCache.set(String(userId),normalizeMemberLabel(label));else memberLabelCache.delete(String(userId));memberLabelLoadedAt=Date.now();}

  function baseAvatar(profile){
    const key=profile?.avatar_key||'avatar-01';
    return baseAvatars.find(x=>x.key===key)||baseAvatars[0];
  }
  function avatarHtml(profile,size='md'){
    const a=baseAvatar(profile);
    return `<span class="c3k-user-avatar is-${size} is-base" title="${esc(a.label)}"><img src="${esc(a.src)}" alt="Avatar ${esc(a.label)}" loading="lazy"></span>`;
  }
  function roleBadgeHtml(role,label=null){return memberLabelBadgeHtml(label,role);}
  function profileIdentityHtml(profile,size='md'){
    return `<div class="c3k-profile-identity">${avatarHtml(profile,size)}<div class="c3k-profile-identity-copy"><strong>${esc(profile?.username||profile?.first_name||'Compte')}</strong>${roleBadgeHtml(profile?.role,profile?.member_label)}</div></div>`;
  }
  function setHidden(form,name,value){
    let input=form.querySelector(`input[name="${name}"]`);
    if(!input){input=document.createElement('input');input.type='hidden';input.name=name;form.appendChild(input);}
    input.value=value??'';
  }
  function selectedKey(form){return form.querySelector('input[name="avatar_key"]')?.value||'avatar-01';}
  function syncAvatarSelection(form){
    const key=selectedKey(form),kind='base';setHidden(form,'avatar_kind','base');setHidden(form,'avatar_url','');
    form.querySelectorAll('[data-base-avatar]').forEach(btn=>btn.classList.toggle('is-selected',kind==='base'&&btn.dataset.baseAvatar===key));
    const preview=form.querySelector('[data-avatar-preview]');
    if(preview){
      const p={avatar_kind:kind,avatar_key:key,avatar_url:form.querySelector('input[name="avatar_url"]')?.value||'',username:'Aperçu'};
      preview.innerHTML=avatarHtml(p,'xl');
    }
  }
  // Avatar personnalisé retiré en V9.0.1.2.5 : seules les variations de camions prédéfinies sont disponibles.
  function enhanceProfileEditor(body,profile){
    const form=body?.querySelector('#c3kV8ProfileForm');if(!form||form.dataset.socialEnhanced)return;
    form.dataset.socialEnhanced='1';
    setHidden(form,'avatar_kind','base');setHidden(form,'avatar_key',profile?.avatar_key||'avatar-01');setHidden(form,'avatar_url','');
    const actions=form.querySelector('.c3k-v8-actions');
    const block=document.createElement('section');block.className='c3k-profile-social-editor';
    block.innerHTML=`
      <div class="c3k-profile-avatar-editor-head"><div data-avatar-preview>${avatarHtml({avatar_key:profile?.avatar_key||'avatar-01'},'xl')}</div><div><strong>Avatar camion</strong><p>Choisis une variation de camion parmi la galerie. Les avatars personnalisés ne sont plus autorisés.</p></div></div>
      <div class="c3k-base-avatar-grid" role="list" aria-label="Avatars proposés">${baseAvatars.map(a=>`<button class="c3k-base-avatar-choice" type="button" data-base-avatar="${a.key}" title="${esc(a.label)}">${avatarHtml({avatar_kind:'base',avatar_key:a.key,username:a.label},'lg')}<span>${esc(a.label)}</span></button>`).join('')}</div>
      <label>Statut libre<textarea name="status_text" maxlength="90" rows="2" placeholder="Ex. En cotation, au téléphone, en pause…">${esc(profile?.status_text||'')}</textarea><span class="c3k-v8-muted">90 caractères maximum. Visible dans la liste des utilisateurs en ligne.</span></label>
    `;
    form.insertBefore(block,actions);
    form.querySelectorAll('[data-base-avatar]').forEach(btn=>btn.addEventListener('click',()=>{setHidden(form,'avatar_kind','base');setHidden(form,'avatar_key',btn.dataset.baseAvatar);setHidden(form,'avatar_url','');syncAvatarSelection(form);}));
    syncAvatarSelection(form);
  }

  let pop=null;
  function ensurePresencePop(){
    if(pop)return pop;
    pop=document.createElement('section');pop.id='c3kPresencePop';pop.className='c3k-presence-pop';pop.hidden=true;pop.setAttribute('aria-label','Utilisateurs en ligne');
    document.body.appendChild(pop);
    document.addEventListener('pointerdown',e=>{if(pop.hidden)return;if(pop.contains(e.target)||e.target.closest('.c3k-v8-presence'))return;pop.hidden=true;});
    document.addEventListener('keydown',e=>{if(e.key==='Escape'&&pop)pop.hidden=true;});
    return pop;
  }
  function flattenPresence(state){
    const out=[];
    Object.entries(state||{}).forEach(([key,entries])=>{
      const meta=Array.isArray(entries)&&entries.length?entries[entries.length-1]:null;if(!meta)return;
      out.push({...meta,_key:key});
    });
    return out.sort((a,b)=>String(a.pseudo||'').localeCompare(String(b.pseudo||''),'fr',{sensitivity:'base'}));
  }
  function drawPresence(){
    const p=ensurePresencePop(),rows=flattenPresence(window.C3K_PRESENCE_STATE||{});
    p.innerHTML=`<div class="c3k-presence-pop-head"><strong>En ligne maintenant</strong><span>${rows.length}</span></div><div class="c3k-presence-list">${rows.map(u=>{
      const isGuest=!u.user_id;
      const fake={username:u.pseudo||'Visiteur',first_name:u.first_name||'',role:u.role||'guest',avatar_kind:u.avatar_kind||'base',avatar_key:u.avatar_key||'avatar-01',avatar_url:u.avatar_url||''};
      const memberLabel=isGuest?null:getMemberLabel(u.user_id);
      return `<article class="c3k-presence-user">${avatarHtml(fake,'md')}<div class="c3k-presence-user-copy"><div class="c3k-presence-user-name"><strong>${esc(fake.username)}</strong>${isGuest?'<span class="c3k-presence-guest">VISITEUR</span>':roleBadgeHtml(fake.role,memberLabel)}</div>${u.status_text?`<div class="c3k-status-bubble">${esc(u.status_text)}</div>`:'<div class="c3k-presence-no-status">Disponible</div>'}</div><span class="c3k-online-dot" title="En ligne"></span></article>`;
    }).join('')||'<div class="c3k-presence-empty">Personne d’autre n’est connecté.</div>'}</div>`;
  }
  function togglePresence(anchor){
    const p=ensurePresencePop();if(!p.hidden){p.hidden=true;return;}drawPresence();
    const rect=anchor.getBoundingClientRect(),width=Math.min(390,window.innerWidth-24);p.style.width=`${width}px`;p.style.left=`${Math.max(12,Math.min(rect.left,window.innerWidth-width-12))}px`;p.style.top=`${Math.min(window.innerHeight-p.offsetHeight-12,rect.bottom+8)}px`;p.hidden=false;
    refreshMemberLabels(true).then(()=>{if(pop&&!pop.hidden)drawPresence();}).catch(()=>{});
  }
  function bindPresence(){
    document.querySelectorAll('.c3k-v8-presence').forEach(el=>{if(el.dataset.presenceBound)return;el.dataset.presenceBound='1';el.setAttribute('role','button');el.setAttribute('tabindex','0');el.title='Voir les utilisateurs en ligne';el.addEventListener('click',()=>togglePresence(el));el.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();togglePresence(el);}});});
  }
  function init(){bindPresence();ensurePresencePop();window.addEventListener('c3k:presence-state',()=>{if(pop&&!pop.hidden){drawPresence();refreshMemberLabels().then(()=>{if(pop&&!pop.hidden)drawPresence();}).catch(()=>{});}});window.addEventListener('c3k:account-state',e=>{if(e.detail?.session?.user)refreshMemberLabels(true).then(()=>{if(pop&&!pop.hidden)drawPresence();}).catch(()=>{});else{memberLabelCache.clear();memberLabelLoadedAt=0;if(pop&&!pop.hidden)drawPresence();}});new MutationObserver(bindPresence).observe(document.body,{childList:true,subtree:true});}

  window.C3K_SOCIAL_PROFILE={baseAvatars,memberLabelPresets:MEMBER_LABEL_PRESETS,memberLabelIconPresets:MEMBER_LABEL_ICON_PRESETS,avatarHtml,roleBadgeHtml,memberLabelBadgeHtml,defaultMemberLabel,profileIdentityHtml,enhanceProfileEditor,refreshMemberLabels,getMemberLabel,setMemberLabel,refreshPresence:drawPresence};
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
