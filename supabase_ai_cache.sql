-- Create a table to cache AI explanations to save API costs
create table if not exists public.ai_explanation_cache (
  id uuid default gen_random_uuid() primary key,
  question_id bigint not null,
  wrong_answer_label text not null, -- 'A', 'B', 'C', 'D', 'E'
  explanation_text text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- Add RLS policies
alter table public.ai_explanation_cache enable row level security;

-- Allow read access to everyone (authenticated and anon)
create policy "Allow read access to everyone"
  on public.ai_explanation_cache for select
  using (true);

-- Allow insert access only to service_role or authenticated users (for now, let's allow authenticated to simple cache misses)
-- Better: Use a function or only allow server-side inserts. 
-- For simplicity in this architecture where server component/API route writes:
-- The API route uses the service role key usually or the authenticated user context.
-- Let's allow authenticated users to insert for now, assuming the API calls this.
create policy "Allow authenticated insert"
  on public.ai_explanation_cache for insert
  with check (auth.role() = 'authenticated');

-- Create index for faster lookups
create index if not exists idx_ai_cache_lookup 
  on public.ai_explanation_cache (question_id, wrong_answer_label);
