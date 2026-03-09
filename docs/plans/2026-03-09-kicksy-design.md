# Kicksy — Design Document
_Last updated: 2026-03-09_

---

## 1. Product Vision

**Kicksy** è la piattaforma per gruppi di amici sportivi che vogliono organizzarsi meglio, giocare meglio e divertirsi di più — senza WhatsApp, senza fogli Excel, senza casino.

Mobile-first, semplice da usare, intelligente sotto il cofano.

**Ambizioni future**: multi-sport (basket, volley), open source / SaaS, multilingua (IT → EN).

---

## 2. Architettura Tecnica

### Stack
- **Frontend**: Next.js 15 (App Router) + React
- **Styling**: Tailwind CSS v4
- **Auth**: Supabase Auth + Google OAuth
- **Database**: Supabase (PostgreSQL + RLS)
- **Storage**: Supabase Storage (avatar, immagini)
- **Email/Notifiche**: Resend
- **LLM resoconti**: OpenAI GPT-4.1 (via env `OPENAI_API_KEY`)
- **Image generation**: Google Gemini (via env `GEMINI_API_KEY`)
- **Deployment**: Vercel

### Principi architetturali
- **Multi-tenant**: Shared DB + Row Level Security. Ogni tabella sensibile ha `group_id`. Le RLS policy garantiscono isolamento completo.
- **Sport-agnostic**: `sport_configs` table definisce posizioni, attributi skill e regole dimensione partita per sport. Football è il template default.
- **i18n-ready**: tutti i testi UI via dizionario `i18n_messages`. Locale IT di default, struttura pronta per EN.
- **Scalabilità**: architettura stateless, Edge Functions per logica pesante (team generation), denormalizzazione in `player_stats` per performance dashboard.

---

## 3. Ruoli Utente

| Ruolo | Poteri |
|---|---|
| Super Admin | Crea gruppi, gestisce tenant, accesso globale |
| Group Admin | Crea partite, conferma date, genera squadre, gestisce votazioni, corregge risultati, gestisce preset, modera |
| Player | Si iscrive, vota, valuta, vede stats |
| Guest | Visualizza partite pubbliche e classifica |

---

## 4. Funzionalità MVP

1. Auth (Google login) + onboarding profilo completo
2. Gruppi: crea, invito link+codice, join, admin revoke
3. Partite: proposta con slot multipli, iscrizioni, conferma data admin
4. Dimensione auto: calcetto/calciotto/calcio11 configurabile per iscritti
5. Squadre: generazione bilanciata con ruoli e vincoli custom
6. Risultati: score + marcatori facoltativi
7. Votazioni post-partita: preset + custom, apertura admin
8. Rating: autovalutazione onboarding + peer rating opzionale (globale + post-partita)
9. Dashboard: stats personali, classifica gruppo, presenze
10. Gamification: XP, livelli (Pivetto→Pallone d'Oro), badge (3 livelli), titoli equipaggiabili, sfide mensili
11. i18n: IT default, struttura EN pronta
12. Multi-tenant: gruppi isolati, sport template football

## Funzionalità Future
- Rating post-partita con peso crescente nel tempo
- Matchmaking v2 con storico
- Multi-sport templates (basket, volley)
- Push notifications PWA
- WhatsApp bot notifiche
- Stripe gruppi premium
- Open source / self-hosted mode
- LLM resoconti partita (GPT-4.1) — env predisposto
- Generazione immagini (Gemini) — env predisposto

---

## 5. User Journey Principale (Mobile)

```
1. Apri Kicksy → login Google (2 tap)
2. Prima volta → completa profilo + autovalutazione skill
3. Crea/unisciti gruppo via link WhatsApp → 1 tap
4. Homepage → prossima partita in evidenza
5. "Partecipo" → 1 tap → iscritto
6. Giorno partita → notifica squadre generate
7. Post-partita → inserisci gol, vota MVP → guadagni XP + badge
```

---

## 6. Data Model (Supabase)

```sql
-- MULTI-TENANT CORE
groups (id, name, slug, sport_config_id, invite_code, created_by, created_at)
sport_configs (id, name, positions[], skill_attributes JSONB, match_size_rules JSONB)
group_members (id, group_id, user_id, role, joined_at, banned_at)

-- PROFILI
profiles (id=auth.uid, display_name, nickname, avatar_url, bio,
          preferred_number, preferred_position, secondary_positions[],
          play_style_tags[])

-- PARTITE
matches (id, group_id, title, location, sport_config_id, status,
         min_players, max_players, notes, created_by)
match_slots (id, match_id, starts_at, confirmed bool)
match_registrations (id, match_id, slot_id, user_id, status, registered_at)
match_results (id, match_id, team_a_score, team_b_score, notes, recorded_by)
match_goals (id, match_id, user_id, team, count)
generated_teams (id, match_id, team_a_player_ids[], team_b_player_ids[],
                 algorithm_version, balance_score, constraints_applied JSONB)

-- RATING
player_ratings (id, rater_id, rated_id, group_id, match_id nullable,
                skill_scores JSONB, season, created_at)
player_stats (id, user_id, group_id, season, overall_score,
              macro_scores JSONB, matches_played, goals, wins,
              reliability_score, rater_score, xp, level, updated_at)

-- VOTAZIONI
poll_templates (id, group_id, title, description, is_global bool)
polls (id, match_id, template_id, title, status, closes_at, created_by)
poll_votes (id, poll_id, voter_id, voted_for_id, created_at)

-- GAMIFICATION
badges (id, code, name, description, icon, category, tier, trigger_rule JSONB)
player_badges (id, user_id, group_id, badge_id, match_id, earned_at)
player_titles (id, user_id, group_id, title_code, equipped bool, earned_at)
monthly_challenges (id, group_id, month, challenges JSONB, active bool)
challenge_progress (id, user_id, challenge_id, progress, completed, completed_at)

-- VINCOLI SQUADRE
team_constraints (id, group_id, player_a_id, player_b_id,
                  type: never_together|prefer_apart|always_together)

-- SISTEMA
notifications (id, user_id, type, payload JSONB, read, created_at)
i18n_messages (key, locale, value)
```

**RLS Pattern**: ogni tabella con `group_id` → policy `auth.uid() IN (SELECT user_id FROM group_members WHERE group_id = table.group_id)`.

---

## 7. Rating System

### 22 Skill → 6 Macro (da Excel storico)

| Macro | Skill | Peso Overall |
|---|---|---|
| ATLETISMO | Velocità, Resistenza, Forza | 18% |
| TECNICA | Controllo palla, Dribbling, Passaggi corti, Passaggi lunghi | 24% |
| TATTICA | Senso tattico, Visione, Adattabilità multiruolo | 19% |
| MENTALITÀ | Agonismo, Freddezza, Comunicazione, Attenzione | 19% |
| DIFESA | Contrasti, Letture, Predisposizione difensiva | 12% |
| ATTACCO | Tiro, Colpo di testa, Fiuto del gol | 14% |

### Formula Overall (Bayesian Smoothing)

```
overall_raw = Σ(skill_i × peso_globale_i) / 100
overall_bayes = (n × overall_raw + k × group_mean) / (n + k)
# k = 5 (prior strength, configurabile)
```

### Pesi per Ruolo (usati solo per matchmaking)

Ruoli: D (Difensore), C (Centrocampista), E (Esterno), W (Winger), A (Attaccante).
Ogni skill ha peso 0-10 per ruolo (da RUOLI sheet Excel). Somma = 100 per ruolo.

### Anti-abuse
- Rater devia > 2.5σ dalla media → peso dimezzato automaticamente
- Auto-valutazione: peso 0.3x (onboarding), scende a 0.1x dopo 5 valutazioni ricevute
- `rater_reliability_score` calcolato e mostrato come badge privato

### Timing valutazioni
- **Globale**: finestre periodiche (es. ogni 3 mesi), completamente opzionale
- **Post-partita**: disponibile per 48h dopo ogni match, opzionale
- **Reward**: XP per ogni rating completato, badge progressivi

---

## 8. Team Balancing Algorithm

### Pseudocodice

```typescript
function generateTeams(players: Player[], constraints: Constraint[], sportConfig: SportConfig) {
  // Step 1: punteggio pesato per ruolo
  const scored = players.map(p => ({
    ...p,
    weightedScore: computeRoleWeightedScore(p, p.position, sportConfig)
  }))

  // Step 2: snake draft iniziale per overall
  let [teamA, teamB] = snakeDraft(scored.sort((a,b) => b.overallScore - a.overallScore))

  // Step 3: hard constraints (never_together)
  for (const c of constraints.filter(c => c.type === 'never_together')) {
    if (bothInSameTeam(c, teamA)) swapOptimal(c.playerB, teamA, teamB)
  }

  // Step 4: simulated annealing
  let best = { teamA, teamB }
  let temp = 1.0

  for (let i = 0; i < 1000; i++) {
    const candidate = swapRandomPair(teamA, teamB)
    if (satisfiesHardConstraints(candidate, constraints)) {
      const delta = balanceScore(candidate) - balanceScore({ teamA, teamB })
      if (delta > 0 || Math.random() < Math.exp(delta / temp)) {
        ;({ teamA, teamB } = candidate)
        if (balanceScore({ teamA, teamB }) > balanceScore(best)) best = { teamA, teamB }
      }
    }
    temp *= 0.995
  }

  return best
}

function balanceScore({ teamA, teamB }: Teams): number {
  const overallDiff = Math.abs(avg(teamA.map(p => p.overallScore)) - avg(teamB.map(p => p.overallScore)))
  const rolePenalty = computeRoleCoveragePenalty(teamA, teamB)
  return -(overallDiff * 2 + rolePenalty)
}
```

### Evoluzione v2
Aggiunge al `balanceScore`: `win_rate_with_team` storico e `goal_impact` per giocatore.

---

## 9. UI/UX Design System

### Direzione Estetica: "Stadium Night"

Dark-first. Ispirata ai broadcast sportivi premium, floodlight notturni, grafica VAR.
Non generica, non banale. Qualcosa che fa dire "questa è figa" al primo uso.

### Palette

```css
--color-bg:        #0A0C12;   /* Nero stadio */
--color-surface:   #111318;
--color-elevated:  #181C25;
--color-border:    #252A36;

--color-primary:   #C8FF6B;   /* Lime elettrico */
--color-secondary: #FFB800;   /* Giallo gol */
--color-danger:    #FF3B5C;   /* Rosso cartellino */
--color-info:      #4D9FFF;

--color-text-1:    #F0F2F5;
--color-text-2:    #8891A4;
--color-text-3:    #4A5166;
```

### Tipografia

```css
--font-display: 'Barlow Condensed', sans-serif; /* 700/800, uppercase per score */
--font-ui:      'Outfit', sans-serif;            /* 400/500/600 per UI */
--font-mono:    'JetBrains Mono', monospace;     /* rating, stat numerici */
```

### Componenti chiave
- `MatchCard` — gradient lime header, dot pulsante iscritti live
- `PlayerCard` — stile carta FIFA, overall prominente, barre macro
- `TeamSplit` — colonne A/B con separatore "VS" animato
- `RatingSlider` — feedback colore rosso→giallo→verde
- `BadgeShelf` — glow sull'ultimo badge guadagnato
- `PollCard` — swipe mobile, tap desktop, risultati animati
- `StatNumber` — counter animato al mount
- `BottomNav` — 5 tab mobile, active indicator lime

### Animazioni chiave
- Nuovo badge → overlay full-screen particelle
- Level up → confetti + nuovo titolo
- Squadre generate → flip card reveal
- Sfida completata → check animato + XP counter
- MVP ricevuto → stelle cadenti in notifica
- Iscrizione → bounce sul contatore

---

## 10. Gamification

### Livelli & Ranghi

| Livello | Titolo | XP | Unlock |
|---|---|---|---|
| 1 | Pivetto | 0 | Profilo base |
| 2 | Jolly | 150 | Frame argento |
| 3 | Titolare | 400 | Colore nickname |
| 4 | Veterano | 800 | Card animata |
| 5 | Capitano | 1.500 | Icona ⚡ in lista partite |
| 6 | Bandiera | 3.000 | Frame dorato + slot extra |
| 7 | Fenomeno | 6.000 | Particelle profilo |
| 8 | Pallone d'Oro | 12.000 | Profilo leggendario |

### XP per azione

| Azione | XP |
|---|---|
| Iscrizione confermata | +20 |
| Presenza effettiva | +30 |
| Gol segnato | +15 |
| Vittoria | +25 |
| Votazione post-partita | +10 |
| MVP ricevuto | +40 |
| Rating peer | +12 |
| Primo accesso del giorno | +5 |
| Streak 3 partite | +50 bonus |
| Streak 5 partite | +120 bonus |

### Badge (3 livelli: bronzo/argento/oro)

**PRESENZA**: Sempre in Campo (5/20/50), En Plein streak (3/5/10), Puntuale, Nottambulo
**PERFORMANCE**: Cannoniere (5/20/50 gol), Imbattibile (5/20/50 vittorie), Cecchino, Muraglia, MVP
**COMMUNITY**: Talent Scout (5/20/50 rating), Giurato, Organizzatore, Uomo Spogliatoio, Valutatore Affidabile
**STAGIONALI (rari)**: Capocannoniere Stagione, Re della Classifica, Sorpresa dell'Anno, Presenze di Ferro, Bidone Stagionale (ironica)

### Titoli Equipaggiabili

Appare sotto nickname su profilo e card:
- "Il Cecchino" — hat-trick
- "Muraglia Umana" — win rate >75% stagione
- "L'Instancabile" — streak 10
- "Il Professore" — tattica OVR >8.5
- "Mister Gol" — 50 gol
- "Fantasma" — mai "bidone" in 20 partite
- "Il Capitano Eterno" — livello 5 + 50 presenze
- "Pallone d'Oro" — livello 8
- "Re dello Spogliatoio" — uomo spogliatoio x5
- "Il Veterano Leggendario" — 100 partite

### Sfide Mensili
3-4 sfide attive per tutti che si resettano ogni mese con progress bar visibile.

---

## 11. Variabili d'Ambiente

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Email
RESEND_API_KEY=

# AI
OPENAI_API_KEY=        # GPT-4.1 per resoconti partita
GEMINI_API_KEY=        # Gemini per generazione immagini/logo

# App
NEXT_PUBLIC_APP_URL=
NEXT_PUBLIC_DEFAULT_LOCALE=it
```

---

## 12. Struttura Directory Progetto

```
kicksy/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # login, onboarding
│   ├── (app)/                    # authenticated routes
│   │   ├── dashboard/
│   │   ├── matches/
│   │   ├── profile/
│   │   ├── ranking/
│   │   └── group/
│   └── api/                      # Route handlers
├── components/
│   ├── ui/                       # Design system primitivi
│   ├── match/                    # MatchCard, MatchDetail, etc.
│   ├── player/                   # PlayerCard, ProfileView
│   ├── teams/                    # TeamSplit, TeamGeneration
│   ├── polls/                    # PollCard, PollResults
│   ├── gamification/             # BadgeShelf, XPBar, LevelUp
│   └── charts/                   # StatNumber, MiniChart
├── lib/
│   ├── supabase/                 # client, server, middleware
│   ├── algorithms/               # team-balancer, rating-calc
│   ├── gamification/             # xp-engine, badge-checker
│   ├── i18n/                     # dizionario, helper
│   └── ai/                       # openai, gemini clients
├── hooks/                        # useMatch, usePlayer, useRating
├── types/                        # TypeScript types
├── i18n/
│   ├── it.json
│   └── en.json                   # vuoto, struttura pronta
└── supabase/
    ├── migrations/               # SQL migrations
    └── seed.sql                  # sport_configs, badge defs, etc.
```
