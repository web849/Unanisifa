-- Safajin + Safa Ambari landing-page price correction: regular price is ৳1,000.
UPDATE products
SET price = 1000,
    compare_at_price = NULL,
    updated_at = now()
WHERE slug = 'safajin-safa-ambari';
