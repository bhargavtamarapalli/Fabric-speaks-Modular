-- =============================================================================
-- Migration: 20260401000001_seed_initial_catalog.sql
-- Description: Initial seed data for brands and hierarchical categories (Men only)
-- =============================================================================

-- 1. Seed Brands
INSERT INTO brands (name, slug, story) VALUES
('Fabric Speaks', 'fabric-speaks', 'Our flagship in-house brand focusing on premium, fabric-first essentials for the modern man.'),
('Kutch Weavers', 'kutch-weavers', 'Ethically sourced, hand-woven masterpieces from artisanal communities in Gujarat.'),
('Linen Luxury', 'linen-luxury', 'The finest European flax linen, crafted for breathability and timeless style.'),
('Inglish', 'inglish', 'Contemporary lifestyle cuts meeting traditional fabric expertise.')
ON CONFLICT (slug) DO NOTHING;

-- 2. Seed Categories (Recursive Hierarchy)
DO $$
DECLARE
    men_id UUID;
    topwear_id UUID;
    bottomwear_id UUID;
    acc_id UUID;
    coll_id UUID;
BEGIN
    -- Root: Men
    INSERT INTO categories (name, slug, parent_id, display_order)
    VALUES ('Men', 'men', NULL, 1)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO men_id;

    -- Level 2: Topwear (under Men)
    INSERT INTO categories (name, slug, parent_id, display_order)
    VALUES ('Topwear', 'men-topwear', men_id, 1)
    ON CONFLICT (slug) DO UPDATE SET parent_id = EXCLUDED.parent_id
    RETURNING id INTO topwear_id;

    -- Level 2: Bottomwear (under Men)
    INSERT INTO categories (name, slug, parent_id, display_order)
    VALUES ('Bottomwear', 'men-bottomwear', men_id, 2)
    ON CONFLICT (slug) DO UPDATE SET parent_id = EXCLUDED.parent_id
    RETURNING id INTO bottomwear_id;

    -- Level 2: Accessories (under Men)
    INSERT INTO categories (name, slug, parent_id, display_order)
    VALUES ('Accessories', 'men-accessories', men_id, 3)
    ON CONFLICT (slug) DO UPDATE SET parent_id = EXCLUDED.parent_id
    RETURNING id INTO acc_id;

    -- Level 3: Topwear Sub-categories
    INSERT INTO categories (name, slug, parent_id, display_order) VALUES
    ('Shirts', 'men-topwear-shirts', topwear_id, 1),
    ('Kurtas', 'men-topwear-kurtas', topwear_id, 2),
    ('T-Shirts & Polos', 'men-topwear-tshirts', topwear_id, 3),
    ('Waistcoats & Bundis', 'men-topwear-waistcoats', topwear_id, 4)
    ON CONFLICT (slug) DO NOTHING;

    -- Level 3: Bottomwear Sub-categories
    INSERT INTO categories (name, slug, parent_id, display_order) VALUES
    ('Trousers', 'men-bottomwear-trousers', bottomwear_id, 1),
    ('Chinos', 'men-bottomwear-chinos', bottomwear_id, 2),
    ('Shorts & Loungewear', 'men-bottomwear-shorts', bottomwear_id, 3)
    ON CONFLICT (slug) DO NOTHING;

    -- Level 3: Accessories Sub-categories
    INSERT INTO categories (name, slug, parent_id, display_order) VALUES
    ('Socks & Pocket Squares', 'men-acc-socks', acc_id, 1),
    ('Belts', 'men-acc-belts', acc_id, 2)
    ON CONFLICT (slug) DO NOTHING;

    -- Root: Collections
    INSERT INTO categories (name, slug, parent_id, display_order)
    VALUES ('Collections', 'collections', NULL, 2)
    ON CONFLICT (slug) DO UPDATE SET name = EXCLUDED.name
    RETURNING id INTO coll_id;

    -- Level 2: Collection Types
    INSERT INTO categories (name, slug, parent_id, display_order) VALUES
    ('The Linen Edit', 'coll-linen-edit', coll_id, 1),
    ('Festive Series', 'coll-festive-series', coll_id, 2),
    ('Office Essentials', 'coll-office-essentials', coll_id, 3),
    ('Co-ord Sets', 'coll-coord-sets', coll_id, 4)
    ON CONFLICT (slug) DO NOTHING;

END $$;
