CREATE TYPE order_status AS ENUM ('PENDING', 'CONFIRMED', 'CANCELLED');

CREATE TABLE orders (
  id          UUID        PRIMARY KEY,
  customer_id UUID        NOT NULL,
  status      order_status NOT NULL DEFAULT 'PENDING',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_orders_customer_id ON orders (customer_id);
CREATE INDEX idx_orders_status      ON orders (status);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TABLE order_items (
  id                  UUID           PRIMARY KEY,
  order_id            UUID           NOT NULL REFERENCES orders (id) ON DELETE CASCADE,
  product_id          UUID           NOT NULL,
  quantity            INTEGER        NOT NULL CHECK (quantity > 0),
  unit_price_amount   NUMERIC(12, 2) NOT NULL CHECK (unit_price_amount >= 0),
  unit_price_currency CHAR(3)        NOT NULL CHECK (unit_price_currency ~ '^[A-Z]{3}$'),

  CONSTRAINT uq_order_product UNIQUE (order_id, product_id)
);

CREATE INDEX idx_order_items_order_id   ON order_items (order_id);
CREATE INDEX idx_order_items_product_id ON order_items (product_id);

-- ─────────────────────────────────────────────────────────────────────────────

CREATE TYPE outbox_event_type AS ENUM (
  'ORDER_CREATED',
  'ORDER_ITEM_ADDED',
  'ORDER_CONFIRMED',
  'ORDER_CANCELLED'
);

CREATE TABLE outbox (
  id           UUID             PRIMARY KEY,
  aggregate_id UUID             NOT NULL,
  event_type   outbox_event_type NOT NULL,
  payload      JSONB            NOT NULL,
  occurred_on  TIMESTAMPTZ      NOT NULL,
  created_at   TIMESTAMPTZ      NOT NULL DEFAULT NOW(),
  published_at TIMESTAMPTZ      NULL
);

-- Partial index: only unpublished rows — this is what the outbox dispatcher scans.
CREATE INDEX idx_outbox_unpublished ON outbox (created_at ASC)
  WHERE published_at IS NULL;

CREATE INDEX idx_outbox_aggregate_id ON outbox (aggregate_id);
