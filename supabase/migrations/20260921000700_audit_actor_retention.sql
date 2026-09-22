alter table public.audit_logs
  drop constraint audit_logs_user_id_fkey;

comment on column public.audit_logs.user_id is
  'Immutable actor UUID retained even if the authentication profile is later deleted.';
