'use client'

import { useState } from 'react'
import { MatchCard } from '@/components/ui/MatchCard'
import { PlayerFIFACard } from '@/components/ui/PlayerFIFACard'
import { RadarChart } from '@/components/ui/RadarChart'
import { Avatar } from '@/components/ui/Avatar'
import { Button } from '@/components/ui/Button'
import {
  IconHomeFilled, IconHome,
  IconMatchFilled, IconMatch,
  IconGroupFilled, IconGroup,
  IconRankingFilled, IconRanking,
  IconProfileFilled, IconProfile,
  IconSoccerBall,
  IconBolt,
  IconTrophy,
  IconFire,
  IconTarget,
  IconShield,
  IconStar,
  IconChevronRight,
  IconSettings,
  IconEdit,
} from '@/components/ui/Icons'
import type { Match, MatchRegistration } from '@/types'

// ─── Mock Data ──────────────────────────────────────────────────────────

const MOCK_PLAYERS = [
  {
    player: { user_id: '1', username: 'luca_baggio', full_name: 'Luca Baggio', avatar_url: null, level: 5, preferred_role: 'A' as const, preferred_role_2: 'W' as const },
    ovr: 87,
    skillBars: [
      { abbr: 'ATL', label: 'Atletismo', value: 7.2, color: 'var(--color-atletismo)' },
      { abbr: 'TEC', label: 'Tecnica', value: 9.1, color: 'var(--color-tecnica)' },
      { abbr: 'TAT', label: 'Tattica', value: 8.5, color: 'var(--color-tattica)' },
      { abbr: 'MEN', label: 'Mentalita', value: 8.8, color: 'var(--color-mentalita)' },
      { abbr: 'DIF', label: 'Difesa', value: 5.4, color: 'var(--color-difesa)' },
      { abbr: 'ATT', label: 'Attacco', value: 9.3, color: 'var(--color-attacco)' },
    ],
    isMe: true,
  },
  {
    player: { user_id: '2', username: 'marco_rossi', full_name: 'Marco Rossi', avatar_url: null, level: 7, preferred_role: 'D' as const },
    ovr: 93,
    skillBars: [
      { abbr: 'ATL', label: 'Atletismo', value: 9.5, color: 'var(--color-atletismo)' },
      { abbr: 'TEC', label: 'Tecnica', value: 7.8, color: 'var(--color-tecnica)' },
      { abbr: 'TAT', label: 'Tattica', value: 9.2, color: 'var(--color-tattica)' },
      { abbr: 'MEN', label: 'Mentalita', value: 9.0, color: 'var(--color-mentalita)' },
      { abbr: 'DIF', label: 'Difesa', value: 9.6, color: 'var(--color-difesa)' },
      { abbr: 'ATT', label: 'Attacco', value: 6.2, color: 'var(--color-attacco)' },
    ],
  },
  {
    player: { user_id: '3', username: 'gianluca10', full_name: 'Gianluca De Luca', avatar_url: null, level: 3, preferred_role: 'C' as const },
    ovr: 72,
    skillBars: [
      { abbr: 'ATL', label: 'Atletismo', value: 6.8, color: 'var(--color-atletismo)' },
      { abbr: 'TEC', label: 'Tecnica', value: 7.5, color: 'var(--color-tecnica)' },
      { abbr: 'TAT', label: 'Tattica', value: 7.0, color: 'var(--color-tattica)' },
      { abbr: 'MEN', label: 'Mentalita', value: 6.5, color: 'var(--color-mentalita)' },
      { abbr: 'DIF', label: 'Difesa', value: 7.2, color: 'var(--color-difesa)' },
      { abbr: 'ATT', label: 'Attacco', value: 7.4, color: 'var(--color-attacco)' },
    ],
  },
  {
    player: { user_id: '4', username: 'fabio_k', full_name: 'Fabio Kessie', avatar_url: null, level: 2, preferred_role: 'E' as const },
    ovr: 0,
    skillBars: [
      { abbr: 'ATL', label: 'Atletismo', value: 0, color: 'var(--color-atletismo)' },
      { abbr: 'TEC', label: 'Tecnica', value: 0, color: 'var(--color-tecnica)' },
      { abbr: 'TAT', label: 'Tattica', value: 0, color: 'var(--color-tattica)' },
      { abbr: 'MEN', label: 'Mentalita', value: 0, color: 'var(--color-mentalita)' },
      { abbr: 'DIF', label: 'Difesa', value: 0, color: 'var(--color-difesa)' },
      { abbr: 'ATT', label: 'Attacco', value: 0, color: 'var(--color-attacco)' },
    ],
  },
]

const tomorrow = new Date()
tomorrow.setDate(tomorrow.getDate() + 1)
tomorrow.setHours(21, 0, 0, 0)

const nextWeek = new Date()
nextWeek.setDate(nextWeek.getDate() + 5)
nextWeek.setHours(19, 30, 0, 0)

const yesterday = new Date()
yesterday.setDate(yesterday.getDate() - 1)
yesterday.setHours(20, 0, 0, 0)

const MOCK_MATCHES: Array<{ match: Match; registration: MatchRegistration | null; confirmedCount: number }> = [
  {
    match: {
      id: '1', group_id: 'g1', title: 'Calcetto del Giovedi', status: 'open',
      scheduled_at: tomorrow.toISOString(), location: 'Centro Sportivo Roma',
      max_players: 10, created_by: '1', created_at: '',      score_a: null, score_b: null, mvp_user_id: null, is_recurring: false,
    },
    registration: { id: 'r1', match_id: '1', user_id: '1', status: 'confirmed', created_at: '' },
    confirmedCount: 7,
  },
  {
    match: {
      id: '2', group_id: 'g1', title: 'Torneo Flash 5v5', status: 'locked',
      scheduled_at: nextWeek.toISOString(), location: 'Palestra San Marco',
      max_players: 10, created_by: '2', created_at: '',      score_a: null, score_b: null, mvp_user_id: null, is_recurring: false,
    },
    registration: { id: 'r2', match_id: '2', user_id: '1', status: 'waitlist', created_at: '' },
    confirmedCount: 10,
  },
  {
    match: {
      id: '3', group_id: 'g1', title: 'Partitella Domenicale', status: 'played',
      scheduled_at: yesterday.toISOString(), location: 'Campo Comunale',
      max_players: 14, created_by: '1', created_at: '',      score_a: 4, score_b: 3, mvp_user_id: '1', is_recurring: false,
    },
    registration: { id: 'r3', match_id: '3', user_id: '1', status: 'confirmed', created_at: '' },
    confirmedCount: 14,
  },
]

const RADAR_DATA = { ATL: 7.2, TEC: 9.1, TAT: 8.5, MEN: 8.8, DIF: 5.4, ATT: 9.3 }
const RADAR_COLORS = { ATL: '#3B82F6', TEC: '#C8FF6B', TAT: '#FFB800', MEN: '#A855F7', DIF: '#EF4444', ATT: '#F97316' }

const RANKINGS = [
  { rank: 1, name: 'Marco Rossi', ovr: 93, level: 7, matches: 42, role: 'D' },
  { rank: 2, name: 'Luca Baggio', ovr: 87, level: 5, matches: 38, role: 'A' },
  { rank: 3, name: 'Andrea Pirlo', ovr: 85, level: 6, matches: 45, role: 'C' },
  { rank: 4, name: 'Paolo Conte', ovr: 79, level: 4, matches: 31, role: 'W' },
  { rank: 5, name: 'Gianluca De Luca', ovr: 72, level: 3, matches: 22, role: 'C' },
  { rank: 6, name: 'Stefano Neri', ovr: 68, level: 3, matches: 19, role: 'E' },
  { rank: 7, name: 'Fabio Kessie', ovr: 65, level: 2, matches: 12, role: 'E' },
]

const MOCK_BADGES = [
  { icon: IconFire, name: 'Infuocato', tier: 'gold' as const, desc: '10 partite consecutive' },
  { icon: IconTarget, name: 'Cecchino', tier: 'silver' as const, desc: '5 MVP in un mese' },
  { icon: IconShield, name: 'Muraglia', tier: 'bronze' as const, desc: '3 clean sheet' },
  { icon: IconBolt, name: 'Fulmine', tier: 'gold' as const, desc: 'Gol nei primi 5 min' },
  { icon: IconTrophy, name: 'Dominante', tier: 'silver' as const, desc: '10 vittorie di fila' },
  { icon: IconStar, name: 'Stratega', tier: 'bronze' as const, desc: 'Miglior assist-man' },
]

const TIER_STYLES = {
  gold: { color: '#FFD700', bg: 'rgba(255,215,0,0.10)', border: 'rgba(255,215,0,0.3)', glow: '0 0 16px rgba(255,215,0,0.25)' },
  silver: { color: '#C0C0C0', bg: 'rgba(192,192,192,0.10)', border: 'rgba(192,192,192,0.3)', glow: '0 0 12px rgba(192,192,192,0.15)' },
  bronze: { color: '#CD7F32', bg: 'rgba(205,127,50,0.10)', border: 'rgba(205,127,50,0.3)', glow: '0 0 12px rgba(205,127,50,0.15)' },
}

// ─── Sections ───────────────────────────────────────────────────────────

type Section = 'home' | 'players' | 'matches' | 'rankings' | 'profile'

const NAV_ITEMS: { id: Section; label: string; icon: (a: boolean) => React.ReactNode }[] = [
  { id: 'home', label: 'Home', icon: (a) => a ? <IconHomeFilled size={21} /> : <IconHome size={21} /> },
  { id: 'matches', label: 'Partite', icon: (a) => a ? <IconMatchFilled size={21} /> : <IconMatch size={21} /> },
  { id: 'players', label: 'Giocatori', icon: (a) => a ? <IconGroupFilled size={21} /> : <IconGroup size={21} /> },
  { id: 'rankings', label: 'Classifica', icon: (a) => a ? <IconRankingFilled size={21} /> : <IconRanking size={21} /> },
  { id: 'profile', label: 'Profilo', icon: (a) => a ? <IconProfileFilled size={21} /> : <IconProfile size={21} /> },
]

// ─── XP Progress (inline, no server deps) ───────────────────────────────

function PreviewXPBar({ xp }: { xp: number }) {
  const LEVELS = [
    { level: 1, name: 'Pivetto', xp: 0 },
    { level: 2, name: 'Jolly', xp: 150 },
    { level: 3, name: 'Titolare', xp: 400 },
    { level: 4, name: 'Veterano', xp: 800 },
    { level: 5, name: 'Capitano', xp: 1500 },
    { level: 6, name: 'Bandiera', xp: 3000 },
    { level: 7, name: 'Fenomeno', xp: 6000 },
    { level: 8, name: "Pallone d'Oro", xp: 12000 },
  ]

  let current = LEVELS[0]
  let next: typeof current | null = null
  for (let i = 0; i < LEVELS.length; i++) {
    if (xp >= LEVELS[i].xp) {
      current = LEVELS[i]
      next = LEVELS[i + 1] ?? null
    }
  }
  const progress = next ? Math.min(100, ((xp - current.xp) / (next.xp - current.xp)) * 100) : 100

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span className="level-badge" style={{ color: 'var(--color-primary)', borderColor: 'rgba(200,255,107,0.4)', background: 'rgba(200,255,107,0.08)' }}>
          <IconBolt size={10} color="var(--color-primary)" />
          Lv.{current.level} {current.name}
        </span>
        <span style={{ fontFamily: 'var(--font-mono)', fontSize: '0.75rem', color: 'var(--color-text-2)' }}>
          {xp.toLocaleString('it')} XP
        </span>
      </div>
      <div className="xp-bar">
        <div className="xp-bar-fill" style={{ width: `${progress}%` }} />
      </div>
      {next && (
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-3)' }}>
            {xp - current.xp} / {next.xp - current.xp} per {next.name}
          </span>
          <span style={{ fontSize: '0.6875rem', color: 'var(--color-text-3)' }}>
            {next.xp - xp} mancanti
          </span>
        </div>
      )}
    </div>
  )
}

// ─── Section Header ─────────────────────────────────────────────────────

function SectionHeader({ title, action, actionLabel }: { title: string; action?: () => void; actionLabel?: string }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.875rem' }}>
      <h3 style={{
        fontFamily: 'var(--font-display)', fontSize: '0.8125rem', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.1em', color: 'var(--color-text-3)',
      }}>
        {title}
      </h3>
      {action && actionLabel && (
        <button onClick={action} style={{
          display: 'flex', alignItems: 'center', gap: '0.2rem',
          fontSize: '0.75rem', color: 'var(--color-primary)', fontFamily: 'var(--font-display)',
          textTransform: 'uppercase', letterSpacing: '0.06em', fontWeight: 700, cursor: 'pointer',
          background: 'none', border: 'none', padding: '0.25rem 0',
        }}>
          {actionLabel}
          <IconChevronRight size={14} color="var(--color-primary)" />
        </button>
      )}
    </div>
  )
}

// ─── Main Preview ───────────────────────────────────────────────────────

export default function PreviewPage() {
  const [activeSection, setActiveSection] = useState<Section>('home')

  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      maxWidth: 600,
      margin: '0 auto',
      position: 'relative',
    }}>
      {/* Header */}
      <header style={{
        position: 'sticky',
        top: 0,
        zIndex: 400,
        padding: '0.875rem 1.25rem 0.625rem',
        background: 'rgba(10, 12, 18, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderBottom: '1px solid var(--color-border)',
      }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <IconSoccerBall size={22} color="var(--color-primary)" />
            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '1.375rem',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              lineHeight: 1,
            }}>
              <span className="text-gradient-primary">Kicksy</span>
            </h1>
          </div>
          <span style={{
            fontSize: '0.55rem',
            fontFamily: 'var(--font-mono)',
            color: 'var(--color-text-3)',
            padding: '0.2rem 0.5rem',
            background: 'var(--color-elevated)',
            borderRadius: 'var(--radius-full)',
            border: '1px solid var(--color-border)',
            letterSpacing: '0.06em',
          }}>
            PREVIEW
          </span>
        </div>
      </header>

      {/* Content */}
      <main style={{
        flex: 1,
        paddingBottom: 'calc(62px + 1rem)',
        overflowY: 'auto',
      }}>
        {activeSection === 'home' && <HomeSection />}
        {activeSection === 'matches' && <MatchesSection />}
        {activeSection === 'players' && <PlayersSection />}
        {activeSection === 'rankings' && <RankingsSection />}
        {activeSection === 'profile' && <ProfileSection />}
      </main>

      {/* Bottom Nav */}
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 400,
        background: 'rgba(10, 12, 18, 0.92)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderTop: '1px solid var(--color-border)',
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'stretch',
          height: 60,
          maxWidth: 600,
          margin: '0 auto',
        }}>
          {NAV_ITEMS.map(({ id, label, icon }) => {
            const active = activeSection === id
            return (
              <button
                key={id}
                onClick={() => setActiveSection(id)}
                style={{
                  flex: 1,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 2,
                  color: active ? 'var(--color-primary)' : 'var(--color-text-3)',
                  transition: 'all 0.2s ease',
                  position: 'relative',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                }}
              >
                {active && (
                  <div className="nav-indicator" style={{
                    position: 'absolute',
                    top: 0,
                    left: '20%',
                    right: '20%',
                    height: 2.5,
                    background: 'var(--color-primary)',
                    borderRadius: '0 0 4px 4px',
                    boxShadow: '0 2px 8px rgba(200, 255, 107, 0.4)',
                  }} />
                )}
                <div style={{
                  transform: active ? 'scale(1.08)' : 'scale(1)',
                  transition: 'transform 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}>
                  {icon(active)}
                </div>
                <span style={{
                  fontSize: '0.5625rem',
                  fontWeight: active ? 700 : 500,
                  letterSpacing: '0.06em',
                  textTransform: 'uppercase',
                  fontFamily: 'var(--font-display)',
                  opacity: active ? 1 : 0.65,
                }}>
                  {label}
                </span>
              </button>
            )
          })}
        </div>
      </nav>
    </div>
  )
}

// ─── HOME ───────────────────────────────────────────────────────────────

function HomeSection() {
  return (
    <div className="stagger-children" style={{ padding: '1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Greeting */}
      <div>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: '1.75rem', fontWeight: 800,
          textTransform: 'uppercase', letterSpacing: '0.04em', lineHeight: 1.1,
        }}>
          Ciao, Luca
        </h2>
        <p style={{ color: 'var(--color-text-3)', fontSize: '0.8125rem', marginTop: '0.375rem', display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          Pronto per il prossimo match?
          <IconSoccerBall size={14} color="var(--color-text-3)" />
        </p>
      </div>

      {/* XP */}
      <div style={{
        padding: '1.125rem 1.25rem',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
      }}>
        <PreviewXPBar xp={1850} />
      </div>

      {/* Quick actions */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.625rem' }}>
        <QuickAction icon={<IconGroup size={22} color="var(--color-info)" />} label="Gruppi" sub="3 attivi" color="var(--color-text-2)" />
        <QuickAction icon={<IconMatch size={22} color="var(--color-primary)" />} label="Partite" sub="2 in arrivo" color="var(--color-primary)" />
      </div>

      {/* Upcoming */}
      <div>
        <SectionHeader title="In Arrivo" action={() => {}} actionLabel="Vedi tutte" />
        <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          {MOCK_MATCHES.slice(0, 2).map((m) => (
            <div key={m.match.id}>
              <div style={{
                fontSize: '0.6rem', color: 'var(--color-text-3)',
                fontFamily: 'var(--font-display)', textTransform: 'uppercase',
                letterSpacing: '0.1em', marginBottom: '0.375rem', fontWeight: 700,
              }}>
                Calcetto Roma Nord
              </div>
              <MatchCard
                match={m.match}
                registration={m.registration}
                confirmedCount={m.confirmedCount}
              />
            </div>
          ))}
        </div>
      </div>

      {/* Recent */}
      <div>
        <SectionHeader title="Risultati Recenti" />
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
          <div>
            <div style={{
              fontSize: '0.6rem', color: 'var(--color-text-3)',
              fontFamily: 'var(--font-display)', textTransform: 'uppercase',
              letterSpacing: '0.1em', marginBottom: '0.375rem', fontWeight: 700,
            }}>
              Calcetto Roma Nord
            </div>
            <MatchCard
              match={MOCK_MATCHES[2].match}
              registration={MOCK_MATCHES[2].registration}
              confirmedCount={MOCK_MATCHES[2].confirmedCount}
            />
            {/* Score display */}
            <div style={{
              display: 'flex', justifyContent: 'center', gap: '0.75rem',
              alignItems: 'center', marginTop: '0.5rem', padding: '0.375rem',
            }}>
              <span className="score-animate" style={{
                fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800,
                color: 'var(--color-primary)', textShadow: '0 0 12px rgba(200,255,107,0.4)',
              }}>4</span>
              <span style={{
                fontSize: '0.75rem', color: 'var(--color-text-3)',
                fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.15em',
              }}>vs</span>
              <span className="score-animate" style={{
                fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800,
                color: 'var(--color-danger)', textShadow: '0 0 12px rgba(255,59,92,0.3)',
                animationDelay: '0.1s',
              }}>3</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function QuickAction({ icon, label, sub, color }: { icon: React.ReactNode; label: string; sub: string; color: string }) {
  return (
    <div className="card-interactive" style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      gap: '0.375rem', padding: '1.125rem 0.75rem', background: 'var(--color-surface)',
      borderRadius: 'var(--radius-lg)', border: '1px solid var(--color-border)',
      cursor: 'pointer', minHeight: 84,
    }}>
      <div style={{
        width: 40, height: 40, borderRadius: 'var(--radius-md)',
        background: 'var(--color-elevated)', border: '1px solid var(--color-border)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <span style={{
        fontFamily: 'var(--font-display)', fontSize: '0.75rem', fontWeight: 700,
        textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--color-text-1)',
      }}>{label}</span>
      <span style={{
        fontSize: '0.65rem', color: color,
        fontFamily: 'var(--font-display)', textTransform: 'uppercase', letterSpacing: '0.04em',
        fontWeight: 600,
      }}>{sub}</span>
    </div>
  )
}

// ─── MATCHES ────────────────────────────────────────────────────────────

function MatchesSection() {
  const [activeTab, setActiveTab] = useState(0)
  const tabs = ['Tutte', 'In arrivo', 'Giocate']

  return (
    <div style={{ padding: '1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <h2 style={{
        fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: '0.04em',
        animation: 'stagger-in 0.5s ease both',
      }}>
        Partite
      </h2>

      {/* Filter tabs */}
      <div style={{
        display: 'flex', gap: '0.25rem', padding: '0.25rem',
        background: 'var(--color-surface)', borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        animation: 'stagger-in 0.5s ease 0.06s both',
      }}>
        {tabs.map((tab, i) => (
          <button key={tab} onClick={() => setActiveTab(i)} style={{
            flex: 1, padding: '0.5rem',
            borderRadius: 'var(--radius-md)',
            fontSize: '0.75rem', fontWeight: 700,
            fontFamily: 'var(--font-display)',
            textTransform: 'uppercase', letterSpacing: '0.06em',
            background: activeTab === i ? 'var(--color-primary)' : 'transparent',
            color: activeTab === i ? 'var(--color-bg)' : 'var(--color-text-3)',
            transition: 'all 0.2s cubic-bezier(0.34, 1.56, 0.64, 1)',
            cursor: 'pointer', border: 'none',
          }}>
            {tab}
          </button>
        ))}
      </div>

      <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: '0.625rem' }}>
        {MOCK_MATCHES.map((m) => (
          <div key={m.match.id}>
            <MatchCard
              match={m.match}
              registration={m.registration}
              confirmedCount={m.confirmedCount}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── PLAYERS ────────────────────────────────────────────────────────────

function PlayersSection() {
  return (
    <div style={{ padding: '1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      <div style={{ animation: 'stagger-in 0.5s ease both' }}>
        <h2 style={{
          fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800,
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          Giocatori
        </h2>
        <p style={{ fontSize: '0.8125rem', color: 'var(--color-text-3)', marginTop: '0.25rem' }}>
          Schede giocatore con valutazioni e statistiche
        </p>
      </div>

      <div className="stagger-children" style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
        {MOCK_PLAYERS.map((p) => (
          <div key={p.player.user_id}>
            <PlayerFIFACard {...p} />
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── RANKINGS ───────────────────────────────────────────────────────────

function RankingsSection() {
  return (
    <div style={{ padding: '1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      <h2 style={{
        fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800,
        textTransform: 'uppercase', letterSpacing: '0.04em',
        animation: 'stagger-in 0.5s ease both',
      }}>
        Classifica
      </h2>

      {/* Top 3 podium */}
      <div style={{
        display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
        gap: '0.5rem', padding: '0.5rem 0 0',
        animation: 'scale-in 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both',
      }}>
        {[RANKINGS[1], RANKINGS[0], RANKINGS[2]].map((player, i) => {
          const heights = [110, 140, 90]
          const isFirst = i === 1
          const medalColors = ['#C0C0C0', '#FFD700', '#CD7F32']
          return (
            <div key={player.rank} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem',
              width: isFirst ? 100 : 80,
            }}>
              <div style={{ position: 'relative' }}>
                <Avatar name={player.name} size={isFirst ? 'lg' : 'md'} />
                {/* Medal ring */}
                <div style={{
                  position: 'absolute', inset: -3,
                  borderRadius: '50%',
                  border: `2px solid ${medalColors[i]}`,
                  opacity: 0.5,
                }} />
              </div>
              <span style={{
                fontFamily: 'var(--font-display)', fontSize: isFirst ? '0.75rem' : '0.65rem',
                fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em',
                color: 'var(--color-text-1)', textAlign: 'center', lineHeight: 1.2,
              }}>
                {player.name.split(' ')[0]}
              </span>
              <div style={{
                width: '100%', height: heights[i],
                background: isFirst
                  ? 'linear-gradient(180deg, rgba(200,255,107,0.15) 0%, rgba(200,255,107,0.03) 100%)'
                  : 'var(--color-surface)',
                borderRadius: 'var(--radius-lg) var(--radius-lg) 0 0',
                border: `1px solid ${isFirst ? 'rgba(200,255,107,0.25)' : 'var(--color-border)'}`,
                borderBottom: 'none',
                display: 'flex', flexDirection: 'column', alignItems: 'center',
                justifyContent: 'flex-start', paddingTop: '0.75rem', gap: '0.25rem',
                position: 'relative', overflow: 'hidden',
              }}>
                {/* Podium number */}
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: `${medalColors[i]}18`,
                  border: `1.5px solid ${medalColors[i]}40`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontFamily: 'var(--font-display)', fontSize: '0.8125rem', fontWeight: 800,
                  color: medalColors[i],
                }}>
                  {player.rank}
                </div>
                <span style={{
                  fontFamily: 'var(--font-mono)', fontSize: '1.375rem', fontWeight: 700,
                  color: isFirst ? 'var(--color-primary)' : 'var(--color-text-1)',
                  lineHeight: 1,
                }}>
                  {player.ovr}
                </span>
                <span style={{
                  fontSize: '0.5rem', fontFamily: 'var(--font-display)',
                  textTransform: 'uppercase', letterSpacing: '0.1em',
                  color: 'var(--color-text-3)',
                }}>OVR</span>
              </div>
            </div>
          )
        })}
      </div>

      {/* Full ranking list */}
      <div style={{
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        overflow: 'hidden',
      }}>
        {RANKINGS.map((player, i) => (
          <div
            key={player.rank}
            className="card-interactive"
            style={{
              display: 'flex', alignItems: 'center', gap: '0.75rem',
              padding: '0.75rem 1rem',
              borderBottom: i < RANKINGS.length - 1 ? '1px solid var(--color-border)' : 'none',
              animation: `stagger-in 0.4s ease ${i * 0.05}s both`,
              cursor: 'pointer',
              borderRadius: 0,
            }}
          >
            {/* Rank */}
            <span style={{
              fontFamily: 'var(--font-display)', fontSize: '0.875rem', fontWeight: 800,
              color: player.rank <= 3 ? 'var(--color-primary)' : 'var(--color-text-3)',
              width: 22, textAlign: 'center', flexShrink: 0,
            }}>
              {player.rank}
            </span>

            <Avatar name={player.name} size="sm" />

            {/* Info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: '0.8125rem', fontWeight: 700,
                textTransform: 'uppercase', letterSpacing: '0.04em',
                color: 'var(--color-text-1)',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {player.name}
              </div>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.125rem', alignItems: 'center' }}>
                <span className={`position-badge position-badge-${player.role}`} style={{ fontSize: '0.5rem', minWidth: '1rem', height: '1rem' }}>
                  {player.role}
                </span>
                <span style={{ fontSize: '0.65rem', color: 'var(--color-text-3)', fontFamily: 'var(--font-mono)' }}>
                  {player.matches} partite
                </span>
              </div>
            </div>

            {/* OVR */}
            <div style={{ textAlign: 'right', flexShrink: 0 }}>
              <div style={{
                fontFamily: 'var(--font-mono)', fontSize: '1.125rem', fontWeight: 700,
                color: player.ovr >= 90 ? 'var(--color-primary)' : player.ovr >= 80 ? '#FFD700' : 'var(--color-text-1)',
                lineHeight: 1,
              }}>
                {player.ovr}
              </div>
              <div style={{
                fontSize: '0.5rem', fontFamily: 'var(--font-display)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                color: 'var(--color-text-3)',
              }}>OVR</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── PROFILE ────────────────────────────────────────────────────────────

function ProfileSection() {
  const player = MOCK_PLAYERS[0]

  return (
    <div style={{ padding: '1.5rem 1.25rem', display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header card */}
      <div style={{
        padding: '1.5rem 1.25rem',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-xl)',
        border: '1px solid rgba(200,255,107,0.15)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem',
        position: 'relative', overflow: 'hidden',
        animation: 'scale-in 0.5s ease both',
      }}>
        {/* Ambient glow */}
        <div aria-hidden style={{
          position: 'absolute', top: '-60%', left: '50%', transform: 'translateX(-50%)',
          width: 250, height: 250,
          background: 'radial-gradient(circle, rgba(200,255,107,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ position: 'relative' }}>
          <Avatar name="Luca Baggio" size="xl" />
          {/* Online indicator */}
          <div className="pulse-dot" style={{
            position: 'absolute', bottom: 3, right: 3,
            width: 10, height: 10,
          }} />
        </div>

        <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
          <h2 style={{
            fontFamily: 'var(--font-display)', fontSize: '1.5rem', fontWeight: 800,
            textTransform: 'uppercase', letterSpacing: '0.04em',
            color: 'var(--color-primary)', lineHeight: 1.1,
          }}>
            Luca Baggio
          </h2>
          <p style={{
            fontSize: '0.8125rem', color: 'var(--color-text-3)', marginTop: '0.25rem',
            fontFamily: 'var(--font-mono)',
          }}>
            @luca_baggio
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.375rem', flexWrap: 'wrap', justifyContent: 'center' }}>
          <span className="level-badge" style={{ color: 'var(--color-primary)', borderColor: 'rgba(200,255,107,0.4)', background: 'rgba(200,255,107,0.08)' }}>
            <IconBolt size={10} color="var(--color-primary)" />
            Lv.5 Capitano
          </span>
          <span className="position-badge position-badge-A">Attaccante</span>
        </div>

        {/* Stats row */}
        <div style={{
          display: 'flex', gap: '0', padding: '0.75rem 0 0', width: '100%',
          borderTop: '1px solid var(--color-border)', marginTop: '0.25rem',
        }}>
          {[
            { value: '87', label: 'OVR', color: '#FFD700' },
            { value: '38', label: 'Partite', color: 'var(--color-text-1)' },
            { value: '24', label: 'Vittorie', color: 'var(--color-primary)' },
          ].map((stat, si) => (
            <div key={stat.label} style={{
              textAlign: 'center', flex: 1,
              borderRight: si < 2 ? '1px solid var(--color-border)' : 'none',
            }}>
              <div className="stat-number" style={{ fontSize: '1.375rem', color: stat.color }}>
                {stat.value}
              </div>
              <div style={{
                fontSize: '0.55rem', fontFamily: 'var(--font-display)',
                textTransform: 'uppercase', letterSpacing: '0.1em',
                color: 'var(--color-text-3)', marginTop: '0.125rem',
              }}>
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* XP */}
      <div style={{
        padding: '1.125rem 1.25rem',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        animation: 'stagger-in 0.5s ease 0.1s both',
      }}>
        <PreviewXPBar xp={1850} />
      </div>

      {/* Radar chart */}
      <div style={{
        padding: '1.25rem',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem',
        animation: 'stagger-in 0.5s ease 0.2s both',
      }}>
        <SectionHeader title="Profilo Abilita" />
        <RadarChart data={RADAR_DATA} colors={RADAR_COLORS} size={240} />
      </div>

      {/* FIFA Card */}
      <div style={{ animation: 'stagger-in 0.5s ease 0.3s both' }}>
        <SectionHeader title="La Tua Scheda" />
        <PlayerFIFACard {...player} />
      </div>

      {/* Badges */}
      <div style={{
        padding: '1.25rem',
        background: 'var(--color-surface)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--color-border)',
        animation: 'stagger-in 0.5s ease 0.4s both',
      }}>
        <SectionHeader title="Badge" />
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem' }}>
          {MOCK_BADGES.map((badge) => {
            const tier = TIER_STYLES[badge.tier]
            const BadgeIcon = badge.icon
            return (
              <div key={badge.name} title={badge.desc} className="badge-interactive" style={{
                display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.375rem',
                cursor: 'default',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: tier.bg, border: `2px solid ${tier.border}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  boxShadow: tier.glow,
                  transition: 'transform 0.2s ease, box-shadow 0.2s ease',
                }}>
                  <BadgeIcon size={20} color={tier.color} />
                </div>
                <span style={{
                  fontSize: '0.55rem', fontFamily: 'var(--font-display)',
                  fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em',
                  color: tier.color, textAlign: 'center', maxWidth: 60, lineHeight: 1.2,
                }}>
                  {badge.name}
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* Action buttons */}
      <div style={{
        display: 'flex', flexDirection: 'column', gap: '0.625rem',
        animation: 'stagger-in 0.5s ease 0.5s both',
      }}>
        <Button variant="primary" fullWidth>
          <IconEdit size={16} />
          Modifica Profilo
        </Button>
        <Button variant="outline" fullWidth>
          <IconSettings size={16} />
          Impostazioni
        </Button>
      </div>
    </div>
  )
}
