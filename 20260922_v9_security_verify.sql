-- Cotation 3000 V9.0.0 — vérification sécurité
select n.nspname schema_name,c.relname table_name,c.relrowsecurity rls_enabled
from pg_class c join pg_namespace n on n.oid=c.relnamespace
where c.relkind='r' and n.nspname='public'
order by c.relname;

select schemaname,tablename,policyname,roles,cmd
from pg_policies
where schemaname='public'
order by tablename,policyname;

select table_schema,table_name,grantee,privilege_type
from information_schema.role_table_grants
where table_schema in ('public','private') and grantee='anon'
order by table_schema,table_name,privilege_type;

select has_function_privilege('anon','public.submit_client_contact_suggestion(text,text,text,text,text,jsonb)','EXECUTE') as anon_contact_rpc,
       has_function_privilege('anon','public.v9_consume_api_quota(uuid,text,integer,integer)','EXECUTE') as anon_quota_rpc;
