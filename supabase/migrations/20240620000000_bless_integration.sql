-- Intégration Bless Events × Voeux Festifs
-- À exécuter via : supabase db push  ou dans le SQL editor du dashboard Supabase

-- Colonnes d'intégration sur la table events
ALTER TABLE public.events
  ADD COLUMN IF NOT EXISTS bless_event_id UUID UNIQUE,
  ADD COLUMN IF NOT EXISTS source TEXT DEFAULT 'direct'
    CONSTRAINT events_source_check CHECK (source IN ('direct', 'bless_events'));

-- Index rapide pour les lookups par bless_event_id
CREATE INDEX IF NOT EXISTS events_bless_event_id_idx
  ON public.events(bless_event_id);
