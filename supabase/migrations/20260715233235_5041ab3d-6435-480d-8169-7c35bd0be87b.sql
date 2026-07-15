WITH ranked AS (
  SELECT id, ROW_NUMBER() OVER (ORDER BY ordem, created_at) AS rn
  FROM public.home_slides
)
UPDATE public.home_slides h SET ordem = r.rn FROM ranked r WHERE h.id = r.id;