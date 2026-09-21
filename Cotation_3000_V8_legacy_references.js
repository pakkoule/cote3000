/* Cotation 3000 V8.0.31 — pont des référentiels historiques + base communes vers l'éditeur Supabase */
(() => {
  'use strict';
  const byId=id=>document.getElementById(id);
  const parse=(id,fallback)=>{try{return JSON.parse(byId(id)?.textContent||JSON.stringify(fallback))}catch{return fallback}};
  const clone=v=>JSON.parse(JSON.stringify(v));
  const setJson=(id,value)=>{const n=byId(id);if(n)n.textContent=JSON.stringify(value)};
  const uid=prefix=>`${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,8)}`;

  const isoTares=parse('isoTareAverageData',{});
  const isoItems=parse('isoReferenceData',[]).map(item=>({...item,tareAvgKg:Number(item.tareAvgKg ?? isoTares[item.code] ?? 0)}));

  const vatRaw=parse('vatReferenceData',[]);
  const vatIso=parse('vatIntracomIsoData',[]);
  const vatIsoByKey=new Map(vatIso.map(x=>[Number(x.vatKey),x]));
  const vatEls=[...document.querySelectorAll('#vatReferenceModal .vat-reference-country')];
  const vatCountries=vatRaw.map((raw,index)=>{
    const vatKey=Number.isFinite(Number(raw.vatKey))?Number(raw.vatKey):index;
    const meta=vatIsoByKey.get(vatKey)||{};
    const el=vatEls.find(node=>Number(node.dataset.vatKey)===vatKey)||vatEls[index];
    const scope=String(raw.scope||'')||(el?.closest('.vat-reference-section')?.classList.contains('is-no')?'HORS INTRACOM':'INTRACOM');
    const isoText=String(el?.dataset?.vatIso||'').trim().split(/\s+/);
    return {
      vatKey,
      country:String(raw.country||''),
      scope,
      alpha2:String(raw.alpha2||meta.alpha2||isoText[0]||''),
      alpha3:String(raw.alpha3||meta.alpha3||isoText[1]||''),
      numeric:String(raw.numeric||meta.numeric||isoText[2]||''),
      ports:Array.isArray(raw.ports)?clone(raw.ports):[]
    };
  });

  const fuelSource=parse('fuelSurchargeData',{schema:2,months:{}});
  const fuelRates=[];
  const fuelClients=[];
  for(const [monthKey,monthData] of Object.entries(fuelSource.months||{})){
    for(const fuel of ['diesel','gnl','hvo']){
      const section=monthData?.[fuel];
      if(!section)continue;
      fuelRates.push({
        _key:`${monthKey}|${fuel}`,
        monthKey,
        month:String(monthData.month||monthKey),
        fuel,
        normal:section.normal??null,
        reduced:section.reduced??null,
        status:String(section.status||'')
      });
      (section.clients||[]).forEach((row,index)=>fuelClients.push({
        _key:`${monthKey}|${fuel}|${index}`,
        monthKey,
        month:String(monthData.month||monthKey),
        fuel,
        name:String(row.name||''),
        traffic:String(row.traffic||''),
        location:String(row.location||''),
        rate:row.rate??null,
        note:String(row.note||'')
      }));
    }
  }

  const accounts=parse('accountReferenceData',[]).map((row,index)=>({...row,_key:`account-${index}`}));
  const portPlaces=parse('portReferenceData',[]).map(row=>({...row}));
  const loti=parse('lotiReferenceData',[]).map(row=>({...row}));
  const lexicon=parse('transportLexiconData',[]).map(row=>({...row}));

  const communesBridge=window.C3K_COMMUNES_EDITOR_BRIDGE;
  const communes=Array.isArray(communesBridge?.list?.())?communesBridge.list():[];

  const registry={
    iso:{items:isoItems},
    vat:{countries:vatCountries},
    fuel:{rates:fuelRates,clients:fuelClients},
    loti:{items:loti},
    lexicon:{items:lexicon},
    accounts:{items:accounts},
    port_places:{items:portPlaces},
    communes:{items:communes}
  };

  function syncIso(){
    const rows=registry.iso.items||[];
    const data=rows.map(({tareAvgKg,...rest})=>rest);
    const tares={}; for(const row of rows){if(row.code&&Number.isFinite(Number(row.tareAvgKg)))tares[row.code]=Number(row.tareAvgKg)}
    setJson('isoReferenceData',data);setJson('isoTareAverageData',tares);
  }
  function syncVat(){
    const rows=[...(registry.vat.countries||[])].sort((a,b)=>Number(a.vatKey)-Number(b.vatKey));
    setJson('vatReferenceData',rows.map(row=>({
      vatKey:Number(row.vatKey),country:row.country||'',scope:row.scope||'HORS INTRACOM',
      alpha2:row.alpha2||'',alpha3:row.alpha3||'',numeric:row.numeric||'',
      ports:Array.isArray(row.ports)?row.ports:[]
    })));
    setJson('vatIntracomIsoData',rows.filter(row=>row.scope==='INTRACOM').map(row=>({vatKey:Number(row.vatKey),country:row.country,alpha2:row.alpha2||'',alpha3:row.alpha3||'',numeric:row.numeric||''})));
  }
  function syncFuel(){
    const months={};
    const ensureMonth=(monthKey,label)=>months[monthKey]||(months[monthKey]={month:label||monthKey});
    for(const rate of registry.fuel.rates||[]){
      if(!rate.monthKey||!rate.fuel)continue;
      const m=ensureMonth(rate.monthKey,rate.month);
      m[rate.fuel]={normal:rate.normal??null,reduced:rate.reduced??null,clients:[]};
      if(rate.status)m[rate.fuel].status=rate.status;
    }
    for(const row of registry.fuel.clients||[]){
      if(!row.monthKey||!row.fuel)continue;
      const m=ensureMonth(row.monthKey,row.month);
      if(!m[row.fuel])m[row.fuel]={normal:null,reduced:null,clients:[]};
      m[row.fuel].clients.push({name:row.name||'',traffic:row.traffic||'',location:row.location||'',rate:row.rate??null,note:row.note||'',c3kKey:row._key||''});
    }
    setJson('fuelSurchargeData',{schema:fuelSource.schema||2,months});
  }
  function syncSimple(id,rows){setJson(id,(rows||[]).map(row=>{const out={};for(const [k,v] of Object.entries(row))if(!k.startsWith('_'))out[k]=v;return out}))}
  function sync(ref){
    if(!ref||ref==='iso')syncIso();
    if(!ref||ref==='vat')syncVat();
    if(!ref||ref==='fuel')syncFuel();
    if(!ref||ref==='loti')syncSimple('lotiReferenceData',registry.loti.items);
    if(!ref||ref==='lexicon')syncSimple('transportLexiconData',registry.lexicon.items);
    if(!ref||ref==='accounts'){setJson('accountReferenceData',(registry.accounts.items||[]).map(row=>({entity:row.entity||'',code_tva:row.code_tva||'',account:row.account||'',title:row.title||'',usage:row.usage||'',tax_label:row.tax_label||'',c3kKey:row._key||''})));}
    if(!ref||ref==='port_places')syncSimple('portReferenceData',registry.port_places.items);
    if(!ref||ref==='communes')communesBridge?.replaceRows?.(registry.communes.items||[]);
  }

  window.C3K_LEGACY_REFERENCES=registry;
  window.C3K_LEGACY_REFERENCE_SYNC=sync;
  window.C3K_LEGACY_REFERENCE_NEW_KEY=uid;
})();
