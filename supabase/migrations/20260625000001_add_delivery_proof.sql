-- Adiciona campo para comprovante de entrega (foto)
-- e configura bucket no Storage para uploads

-- 1. Adiciona coluna proof_image_url na tabela orders
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS proof_image_url text;

-- 2. Adiciona coluna proof_uploaded_at para tracking
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS proof_uploaded_at timestamp with time zone;

-- 3. Cria bucket para comprovantes (idempotente)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'delivery-proofs',
  'delivery-proofs',
  true,
  5242880, -- 5MB
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- 4. Politicas RLS para o bucket de comprovantes
-- Politica SELECT: qualquer um pode ver (bucket public)
CREATE POLICY "Public read delivery proofs"
ON storage.objects FOR SELECT
USING (bucket_id = 'delivery-proofs');

-- Politica INSERT: courier pode fazer upload para pedidos atribuidos a ele
CREATE POLICY "Courier upload own delivery proof"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'delivery-proofs'
  AND EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = (storage.foldername(name))[1]
    AND o.courier_id = auth.uid()
  )
);

-- Politica DELETE: courier pode deletar proprio comprovante
CREATE POLICY "Courier delete own delivery proof"
ON storage.objects FOR DELETE
USING (
  bucket_id = 'delivery-proofs'
  AND EXISTS (
    SELECT 1 FROM orders o
    WHERE o.id = (storage.foldername(name))[1]
    AND o.courier_id = auth.uid()
  )
);
