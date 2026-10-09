
do $$
declare f record;
begin
  for f in select p.oid::regprocedure as sig from pg_proc p join pg_namespace n on n.oid = p.pronamespace
           where n.nspname = 'public' and p.prosecdef loop
    execute format('revoke execute on function %s from public, anon', f.sig);
  end loop;
end $$;
revoke execute on function public.notify_user(uuid, text, text, text, jsonb, text) from authenticated;
revoke execute on function public.notify_members(uuid, uuid, text, text, text, jsonb, text) from authenticated;
revoke execute on function public.claim_invites(uuid, text) from authenticated;
revoke execute on function public.handle_new_user() from authenticated;
revoke execute on function public.enforce_email_domain() from authenticated;
revoke execute on function public.on_invite_created() from authenticated;
revoke execute on function public.on_announcement_created() from authenticated;
revoke execute on function public.on_event_created() from authenticated;
revoke execute on function public.create_default_channels() from authenticated;
revoke execute on function public.guard_society_update() from authenticated;
