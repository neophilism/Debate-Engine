-- PDE-27: repair erroneous BEFORE UPDATE trigger return values.
-- Returning OLD on an allowed UPDATE silently kept the draft instead of publishing.
-- Public records are immutable after their FIRST successful publication transition.
CREATE OR REPLACE FUNCTION public.pde_block_published_submission_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.published_at IS NOT NULL THEN
    RAISE EXCEPTION 'Published submission cannot be modified or removed.' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$;

CREATE OR REPLACE FUNCTION public.pde_block_published_debate_mutation() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.published_at IS NOT NULL THEN
    RAISE EXCEPTION 'Published debate cannot be modified or removed.' USING ERRCODE = '55000';
  END IF;
  IF TG_OP = 'DELETE' THEN RETURN OLD; END IF;
  RETURN NEW;
END; $$;
