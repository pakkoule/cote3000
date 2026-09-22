-- Cotation 3000 V8.0.45 — durcissement RPC suggestions contacts
revoke execute on function public.submit_client_contact_suggestion(text,text,text,text,text,jsonb) from public;
revoke execute on function public.submit_client_contact_suggestion(text,text,text,text,text,jsonb) from anon;
grant execute on function public.submit_client_contact_suggestion(text,text,text,text,text,jsonb) to authenticated;
