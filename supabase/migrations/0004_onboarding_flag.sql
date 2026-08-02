-- Onboarding completion now needs to be tied to the account, not the browser
-- (a signed-in user could open the app on a brand new device and shouldn't
-- see onboarding again just because that device's localStorage is empty).
alter table public.settings add column if not exists onboarding_completed boolean not null default false;
