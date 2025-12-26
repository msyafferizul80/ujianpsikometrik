-- RPC FIX: Safe Profile Update Function
-- This bypasses complex RLS policies by using a server-side trusted function.

create or replace function update_own_profile_name(p_full_name text)
returns void
language plpgsql
security definer -- ✨ Runs with admin privileges
as $$
begin
  update public.profiles
  set 
    full_name = p_full_name,
    updated_at = now()
  where id = auth.uid(); -- 🔒 Ensures users can ONLY update their own ID
end;
$$;
