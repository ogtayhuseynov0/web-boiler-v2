-- Fix timestamp_ms column to use bigint instead of integer
-- Date.now() returns milliseconds since epoch which exceeds integer max value

alter table conversation_messages
  alter column timestamp_ms type bigint;
