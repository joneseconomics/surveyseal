-- Enable RLS on remaining tables

ALTER TABLE public.ai_agent_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.judge_personas ENABLE ROW LEVEL SECURITY;
