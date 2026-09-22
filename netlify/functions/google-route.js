'use strict';

const GOOGLE_ROUTE_URL='https://routes.googleapis.com/directions/v2:computeRoutes';
const GOOGLE_GEOCODE_URL='https://maps.googleapis.com/maps/api/geocode/json';
const SUPABASE_URL=process.env.SUPABASE_URL||'https://mhnujvgzoozimtbrasuh.supabase.co';
const SUPABASE_PUBLISHABLE_KEY=process.env.SUPABASE_PUBLISHABLE_KEY||'sb_publishable_qHIOczDD3MZoa25VO1HVAg_JOhuDUGD';
const GOOGLE_KEY=process.env.GOOGLE_MAPS_API_KEY||'';
const SERVICE_KEY=process.env.SUPABASE_SERVICE_ROLE_KEY||'';

const reply=(status,body,extra={})=>({
  statusCode:status,
  headers:{
    'Content-Type':'application/json; charset=utf-8',
    'Cache-Control':'no-store',
    'X-Content-Type-Options':'nosniff',
    ...extra
  },
  body:status===204?'':JSON.stringify(body)
});
const clean=v=>String(v||'').trim().slice(0,220);
const durationMs=value=>{const m=String(value||'').match(/^([0-9]+(?:\.[0-9]+)?)s$/);return m?Math.round(Number(m[1])*1000):0;};

async function fetchWithTimeout(url,options={},timeoutMs=12000){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),timeoutMs);
  try{return await fetch(url,{...options,signal:controller.signal});}
  finally{clearTimeout(timer);}
}

async function currentUser(authHeader){
  if(!authHeader?.startsWith('Bearer '))return null;
  const res=await fetchWithTimeout(`${SUPABASE_URL}/auth/v1/user`,{
    headers:{apikey:SUPABASE_PUBLISHABLE_KEY,Authorization:authHeader}
  },8000);
  if(!res.ok)return null;
  const user=await res.json();
  return user?.id?user:null;
}

async function consumeQuota(userId){
  if(!SERVICE_KEY)throw new Error('Configuration serveur Supabase incomplète.');
  const res=await fetchWithTimeout(`${SUPABASE_URL}/rest/v1/rpc/v9_consume_api_quota`,{
    method:'POST',
    headers:{apikey:SERVICE_KEY,Authorization:`Bearer ${SERVICE_KEY}`,'Content-Type':'application/json'},
    body:JSON.stringify({p_user_id:userId,p_scope:'google-route',p_limit:120,p_window_minutes:60})
  },8000);
  if(!res.ok)throw new Error(`Contrôle de quota indisponible (${res.status}).`);
  return await res.json();
}

async function geocodeCountry(address){
  try{
    const url=new URL(GOOGLE_GEOCODE_URL);
    url.searchParams.set('address',address);
    url.searchParams.set('language','fr');
    url.searchParams.set('key',GOOGLE_KEY);
    const res=await fetchWithTimeout(url,{},8000);
    if(!res.ok)return null;
    const data=await res.json();
    const result=data?.results?.[0];
    const country=result?.address_components?.find(c=>Array.isArray(c.types)&&c.types.includes('country'));
    return country?{alpha2:String(country.short_name||'').toUpperCase(),countryName:String(country.long_name||'')} : null;
  }catch{return null;}
}

async function handle(event){
  if(event.httpMethod==='OPTIONS')return reply(204,{});
  if(event.httpMethod==='GET'){
    return reply(200,{
      ok:true,
      service:'route-distance',
      version:'9.0.1.2.3',
      configured:Boolean(GOOGLE_KEY&&SERVICE_KEY)
    });
  }
  if(event.httpMethod!=='POST')return reply(405,{error:'Méthode non autorisée.'},{Allow:'GET, POST, OPTIONS'});
  if(!GOOGLE_KEY||!SERVICE_KEY)return reply(503,{error:'Le service Google Routes n’est pas entièrement configuré côté serveur.'});

  const authHeader=event.headers.authorization||event.headers.Authorization||'';
  const user=await currentUser(authHeader);
  if(!user)return reply(401,{error:'Connexion membre requise.'});

  let quota;
  try{quota=await consumeQuota(user.id);}
  catch(error){return reply(503,{error:String(error?.message||'Le contrôle de sécurité du service Google est momentanément indisponible.')});}
  if(quota?.allowed===false)return reply(429,{error:'Limite de calculs Google atteinte. Réessaie plus tard.'},{'Retry-After':'60'});

  let input={};
  try{input=JSON.parse(event.body||'{}');}
  catch{return reply(400,{error:'Requête invalide.'});}
  const origin=clean(input.origin),destination=clean(input.destination);
  if(origin.length<2||destination.length<2)return reply(400,{error:'Départ et destination sont requis.'});

  let routeResponse;
  try{
    routeResponse=await fetchWithTimeout(GOOGLE_ROUTE_URL,{
      method:'POST',
      headers:{
        'Content-Type':'application/json',
        'X-Goog-Api-Key':GOOGLE_KEY,
        'X-Goog-FieldMask':'routes.distanceMeters,routes.duration,routes.localizedValues,routes.warnings'
      },
      body:JSON.stringify({
        origin:{address:origin},
        destination:{address:destination},
        travelMode:'DRIVE',
        routingPreference:'TRAFFIC_UNAWARE',
        languageCode:'fr',
        units:'METRIC'
      })
    },12000);
  }catch(error){
    const timeout=error?.name==='AbortError';
    return reply(502,{error:timeout?'Google Routes met trop de temps à répondre. Réessaie dans quelques secondes.':'Connexion au service Google Routes impossible depuis le serveur.'});
  }

  let routesPayload={};
  try{routesPayload=await routeResponse.json();}catch{}
  if(!routeResponse.ok){
    const message=routesPayload?.error?.message||'Google n’a pas pu calculer cet itinéraire.';
    return reply(routeResponse.status>=500?502:400,{error:message});
  }

  const route=routesPayload?.routes?.[0];
  if(!route||!Number.isFinite(Number(route.distanceMeters)))return reply(422,{error:'Google n’a renvoyé aucun itinéraire exploitable.'});
  const country=await geocodeCountry(destination);
  return reply(200,{
    service:'route-distance',
    distanceMeters:Number(route.distanceMeters),
    durationMillis:durationMs(route.duration),
    warnings:Array.isArray(route.warnings)?route.warnings:[],
    country
  });
}

exports.handler=async event=>{
  try{return await handle(event);}
  catch(error){
    console.error('Cotation 3000 google-route fatal error',error);
    return reply(502,{error:'Le service de calcul Europe a rencontré une erreur serveur. Réessaie dans quelques secondes.'});
  }
};
