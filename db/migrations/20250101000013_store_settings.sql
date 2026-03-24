CREATE TABLE IF NOT EXISTS store_settings (
    setting_key VARCHAR(100) PRIMARY KEY,
    setting_value TEXT NOT NULL,
    updated_by UUID REFERENCES users(id),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Seed default values
INSERT INTO store_settings (setting_key, setting_value) VALUES
    ('store_name', 'Fabric Speaks'),
    ('store_email', 'contact@fabricspeaks.in'),
    ('store_phone', '+919999999999'),
    ('gst_number', 'PENDING'),
    ('free_shipping_above', '1500'),
    ('cod_enabled', 'false'),
    ('stock_alert_threshold', '10'),
    ('razorpay_live_mode', 'false')
ON CONFLICT (setting_key) DO NOTHING;













