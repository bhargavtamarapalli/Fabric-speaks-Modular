-- Seed notification-related settings (admin WhatsApp + preferences)
INSERT INTO store_settings (setting_key, setting_value, updated_at)
VALUES
  (
    'admin_whatsapp',
    '',
    NOW()
  ),
  (
    'inventory_manager_whatsapp',
    '',
    NOW()
  ),
  (
    'admin_notification_preferences',
    '{"new_orders":true,"cod_orders":true,"stock_critical":true,"stock_low":true,"returns":true}',
    NOW()
  )
ON CONFLICT (setting_key) DO NOTHING;
