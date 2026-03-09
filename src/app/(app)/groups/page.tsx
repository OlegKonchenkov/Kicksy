import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Avatar } from '@/components/ui'

export default async function GroupsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: memberships } = await supabase
    .from('group_members')
    .select('role, groups(id, name, description, avatar_url, sport_type)')
    .eq('user_id', user.id)
    .eq('is_active', true)

  const groups = (memberships ?? []).map(m => ({
    ...(m.groups as unknown as { id: string; name: string; description: string | null; avatar_url: string | null; sport_type: string }),
    role: m.role as 'admin' | 'member',
  }))

  return (
    <div style={{ padding: '1.5rem 1rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-1)' }}>
          I Miei Gruppi
        </h1>
        <Link href="/groups/new" style={{ padding: '0.5rem 0.875rem', background: 'var(--color-primary)', color: 'var(--color-bg)', borderRadius: 'var(--radius-md)', fontSize: '0.8125rem', fontWeight: 700, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', textDecoration: 'none' }}>
          + Nuovo
        </Link>
      </div>

      {groups.length === 0 ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', padding: '3rem 1rem', textAlign: 'center' }}>
          <span style={{ fontSize: '3rem' }}>⚽</span>
          <h2 style={{ fontFamily: 'var(--font-display)', fontSize: '1.25rem', fontWeight: 700, textTransform: 'uppercase', color: 'var(--color-text-1)' }}>Nessun gruppo</h2>
          <p style={{ fontSize: '0.875rem', color: 'var(--color-text-3)', maxWidth: 240 }}>Crea un nuovo gruppo o unisciti a uno esistente con un codice invito</p>
          <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap', justifyContent: 'center' }}>
            <Link href="/groups/new" style={{ padding: '0.625rem 1.25rem', background: 'var(--color-primary)', color: 'var(--color-bg)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 700, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', textDecoration: 'none' }}>Crea Gruppo</Link>
            <Link href="/groups/join" style={{ padding: '0.625rem 1.25rem', background: 'var(--color-surface)', color: 'var(--color-text-1)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', fontSize: '0.875rem', fontWeight: 700, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', textDecoration: 'none' }}>Unisciti</Link>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
          {groups.map(group => (
            <Link key={group.id} href={`/groups/${group.id}`} style={{ textDecoration: 'none' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', padding: '1rem', background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)' }}>
                <Avatar src={group.avatar_url} name={group.name} size="md" />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: '1rem', textTransform: 'uppercase', letterSpacing: '0.04em', color: 'var(--color-text-1)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{group.name}</div>
                  {group.description && (
                    <div style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: '0.125rem' }}>{group.description}</div>
                  )}
                </div>
                {group.role === 'admin' && (
                  <span style={{ fontSize: '0.65rem', fontWeight: 700, fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.08em', padding: '0.2rem 0.5rem', borderRadius: 999, color: 'var(--color-primary)', background: 'rgba(200,255,107,0.12)', border: '1px solid rgba(200,255,107,0.3)', whiteSpace: 'nowrap' }}>Admin</span>
                )}
                <span style={{ color: 'var(--color-text-3)', fontSize: '1rem' }}>›</span>
              </div>
            </Link>
          ))}
          <Link href="/groups/join" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '0.875rem', border: '1px dashed var(--color-border)', borderRadius: 'var(--radius-lg)', color: 'var(--color-text-3)', fontSize: '0.875rem', fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.06em', textDecoration: 'none' }}>
            🔗 Unisciti con codice invito
          </Link>
        </div>
      )}
    </div>
  )
}
