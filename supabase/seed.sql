-- ============================================================
-- Kicksy — Seed Data
-- ============================================================

-- ============================================================
-- BADGES
-- ============================================================
INSERT INTO public.badges (key, name_it, name_en, description_it, description_en, icon, tier, condition_type, condition_value) VALUES
-- Match attendance
('first_match',       'Prima Partita',      'First Match',        'Hai giocato la tua prima partita!',           'You played your first match!',              '⚽', 'bronze', 'matches_played', 1),
('match_veteran_10',  'Veterano del Campo', 'Field Veteran',      '10 partite giocate — sei un pilastro!',       'Played 10 matches — you are a pillar!',      '🏟️', 'bronze', 'matches_played', 10),
('match_veteran_25',  'Habitué',            'Regular',            '25 partite — non manchi mai!',                '25 matches — never miss a game!',            '📅', 'silver', 'matches_played', 25),
('match_veteran_50',  'Leggenda del Campo', 'Field Legend',       '50 partite — sei una leggenda!',             '50 matches — you are a legend!',             '🏆', 'gold',   'matches_played', 50),
-- Goals
('first_goal',        'Primo Gol',          'First Goal',         'Hai segnato il tuo primo gol!',               'You scored your first goal!',               '🎯', 'bronze', 'goals_scored', 1),
('scorer_10',         'Cannoniere',         'Top Scorer',         '10 gol segnati — che bomber!',               '10 goals scored — what a striker!',          '💥', 'silver', 'goals_scored', 10),
('scorer_25',         'Re dei Gol',         'Goal King',          '25 gol — sei inarrestabile!',                '25 goals — you are unstoppable!',            '👑', 'gold',   'goals_scored', 25),
-- Wins
('first_win',         'Prima Vittoria',     'First Win',          'Hai vinto la tua prima partita!',             'You won your first match!',                 '✅', 'bronze', 'matches_won', 1),
('win_streak_5',      'Serie Vincente',     'Winning Streak',     '5 vittorie consecutive — fenomenale!',        '5 consecutive wins — phenomenal!',           '🔥', 'gold',   'win_streak', 5),
-- MVP
('first_mvp',         'Primo MVP',          'First MVP',          'Sei stato eletto MVP di una partita!',        'You were elected match MVP!',               '⭐', 'bronze', 'mvp_count', 1),
('mvp_5',             'Pallone d''Oro Club','Golden Ball Club',    '5 MVP — sei un fuoriclasse!',                '5 MVPs — you are a standout!',               '🥇', 'silver', 'mvp_count', 5),
('mvp_10',            'Il Numero Uno',      'The Number One',     '10 MVP — nessuno ti supera!',                '10 MVPs — nobody beats you!',                '💫', 'gold',   'mvp_count', 10),
-- Assists
('first_assist',      'Primo Assist',       'First Assist',       'Hai servito il tuo primo assist!',            'You made your first assist!',               '🅰️', 'bronze', 'assists', 1),
('assist_10',         'Fantasista',         'Playmaker',          '10 assist — sei il maestro del gioco!',       '10 assists — you are the game master!',      '🪄', 'silver', 'assists', 10),
-- Rating participation
('first_rating',      'Primo Voto',         'First Rating',       'Hai valutato un compagno per la prima volta!','You rated a teammate for the first time!',   '📊', 'bronze', 'ratings_given', 1),
('rater_25',          'Scout',              'Scout',              '25 valutazioni date — occhio critico!',       '25 ratings given — critical eye!',           '🔍', 'silver', 'ratings_given', 25),
('rater_100',         'Super Scout',        'Super Scout',        '100 valutazioni — sei il talent scout!',      '100 ratings — you are the talent scout!',    '🎖️', 'gold',   'ratings_given', 100),
-- Social
('group_founder',     'Fondatore',          'Founder',            'Hai creato il tuo gruppo!',                   'You created your group!',                   '🏗️', 'bronze', 'groups_created', 1),
('inviter_5',         'Reclutatore',        'Recruiter',          'Hai invitato 5 amici nel gruppo!',            'You invited 5 friends to the group!',        '📨', 'silver', 'invites_sent', 5),
-- Special
('early_adopter',     'Pioniere',           'Early Adopter',      'Tra i primi a usare Kicksy!',                 'Among the first to use Kicksy!',             '🚀', 'gold',   'early_adopter', 1),
('clean_sheet_5',     'Muro Invalicabile',  'Brick Wall',         '5 clean sheet come difensore!',              '5 clean sheets as defender!',                '🧱', 'silver', 'clean_sheets', 5);

-- ============================================================
-- POLL TEMPLATES (global)
-- ============================================================
INSERT INTO public.poll_templates (question_it, question_en, options_it, options_en, is_global) VALUES
(
  'Chi è stato il migliore in campo?',
  'Who was the best on the pitch?',
  ARRAY['Scegli un giocatore...'],  -- filled dynamically
  ARRAY['Choose a player...'],
  TRUE
),
(
  'Come valuteresti la qualità della partita?',
  'How would you rate the match quality?',
  ARRAY['Pessima 😤', 'Nella media 😐', 'Buona 😊', 'Fantastica 🤩'],
  ARRAY['Terrible 😤', 'Average 😐', 'Good 😊', 'Fantastic 🤩'],
  TRUE
),
(
  'L''arbitraggio è stato giusto?',
  'Was the refereeing fair?',
  ARRAY['Sì, corretto', 'Abbastanza corretto', 'No, migliorabile'],
  ARRAY['Yes, fair', 'Mostly fair', 'No, could be better'],
  TRUE
),
(
  'Rigiocheresti in questo campo/posto?',
  'Would you play here again?',
  ARRAY['Assolutamente sì! 🙌', 'Sì, ma con riserva', 'No, cambiamo'],
  ARRAY['Absolutely yes! 🙌', 'Yes, but with reservations', 'No, let''s change'],
  TRUE
),
(
  'Chi ha fatto il gol più bello?',
  'Who scored the best goal?',
  ARRAY['Scegli un giocatore...'],
  ARRAY['Choose a player...'],
  TRUE
),
(
  'Com''era l''equilibrio tra le squadre?',
  'How balanced were the teams?',
  ARRAY['Molto equilibrate ⚖️', 'Abbastanza equilibrate', 'Sbilanciate 😬'],
  ARRAY['Very balanced ⚖️', 'Fairly balanced', 'Unbalanced 😬'],
  TRUE
);
