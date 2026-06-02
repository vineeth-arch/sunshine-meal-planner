# Supabase Bootstrap

Mom's Kitchen uses manual bootstrap steps for privileged accounts. Do not add a client-side self-elevation path.

## First Household Admin

Create the household row, note its `id`, then assign the first admin profile from a privileged SQL session:

```sql
UPDATE public.profiles
SET role = 'admin', household_id = '<household-uuid>'
WHERE id = '<user-uuid>';
```

## Platform Superadmin

Platform superadmin access is separate from household roles and is read-only across households through RLS policies.

```sql
UPDATE public.profiles
SET is_superadmin = true
WHERE id = '<your-user-uuid>';
```

Do not grant global write policies to `is_superadmin` users. Use service-role SQL only for operational bootstrap changes.
