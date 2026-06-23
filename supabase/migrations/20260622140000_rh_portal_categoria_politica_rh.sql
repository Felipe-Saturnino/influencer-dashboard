-- Portal RH — categoria de política/normativa «RH»

INSERT INTO public.rh_portal_categoria (slug, label, scope, accent_hex, sort_order)
VALUES ('rh', 'RH', 'politica', '#6366f1', 35)
ON CONFLICT (slug, scope) DO NOTHING;
