// ─────────────────────────────────────────────────────────────────────────────
// Fabric Speaks — Admin Design System
// Single source of truth. Change here → all 26 screens update.
// ─────────────────────────────────────────────────────────────────────────────

const COLORS = {
  bg:         '#0A0A0A',
  surface:    '#111111',
  surface2:   '#1A1A1A',
  surface3:   '#161616',
  border:     '#1E1E1E',
  border2:    '#252525',
  linen:      '#C9A96E',
  linenDark:  '#A8843A',
  ivory:      '#F0EBE3',
  ash:        '#A5A5A5',
  muted:      '#8A8A8A',
  ghost:      '#2A2A2A',
  error:      '#E05545',
  danger:     '#E05545',
  gold:       '#C9A96E',
  success:    '#4CAF50',
  info:       '#58A6FF',
  warning:    '#D4A017',
  hover:      'rgba(255,255,255,0.04)',
  hoverLinen: 'rgba(201,169,110,0.08)',
};

const SPACING = {
  xs:  '4px',
  sm:  '8px',
  md:  '12px',
  lg:  '16px',
  xl:  '20px',
  xxl: '28px',
};

export const THEME = {
  colors: COLORS,
  fonts: {
    display: 'Georgia, "Times New Roman", serif',
    ui:      'system-ui, -apple-system, BlinkMacSystemFont, sans-serif',
    mono:    '"Courier New", Courier, monospace',
  },
  fontSizes: {
    xs:   '10px',
    sm:   '11px',
    base: '12.5px',
    md:   '14px',
    lg:   '17px',
    xl:   '21px',
    h1:   '24px',
  },
  spacing: SPACING,
  radius: {
    sm:   '3px',
    md:   '5px',
    lg:   '7px',
    pill: '16px',
  },
  badgeStyles: {
    confirmed:   { background: 'rgba(201,169,110,0.15)', color: COLORS.linen },
    processing:  { background: 'rgba(88,166,255,0.15)',  color: COLORS.info },
    pending:     { background: 'rgba(212,160,23,0.15)',   color: COLORS.warning },
    shipped:     { background: 'rgba(76,175,80,0.15)',   color: COLORS.success },
    delivered:   { background: 'rgba(76,175,80,0.2)',    color: COLORS.success },
    cancelled:   { background: 'rgba(224,85,69,0.15)',   color: COLORS.error },
    refunded:    { background: 'rgba(88,166,255,0.15)',  color: COLORS.info },
    critical:    { background: 'rgba(224,85,69,0.15)',   color: COLORS.error },
    warning:     { background: 'rgba(212,160,23,0.15)',   color: COLORS.warning },
    healthy:     { background: 'rgba(76,175,80,0.15)',   color: COLORS.success },
    active:      { background: 'rgba(76,175,80,0.15)',   color: COLORS.success },
    inactive:    { background: 'rgba(212,160,23,0.15)',   color: COLORS.warning },
    draft:       { background: 'rgba(138,138,138,0.15)',  color: COLORS.muted },
    superadmin:  { background: 'rgba(201,169,110,0.15)', color: COLORS.linen },
    inventory:   { background: 'rgba(88,166,255,0.15)',  color: COLORS.info },
    support:     { background: 'rgba(76,175,80,0.15)',   color: COLORS.success },
    high:        { background: 'rgba(224,85,69,0.15)',   color: COLORS.error },
    medium:      { background: 'rgba(212,160,23,0.15)',   color: COLORS.warning },
    low:         { background: 'rgba(138,138,138,0.15)',  color: COLORS.muted },
    open:        { background: 'rgba(201,169,110,0.15)', color: COLORS.linen },
    resolved:    { background: 'rgba(76,175,80,0.15)',   color: COLORS.success },
    inprogress:  { background: 'rgba(88,166,255,0.15)',  color: COLORS.info },
  },
  layout: {
    sidebarWidth:   '210px',
    topbarHeight:   '54px',
    contentPadding: '20px',
  },
  breakpoints: {
    mobile: 768,
    tablet: 1024,
  },
} as const;

export type BadgeType = keyof typeof THEME.badgeStyles;

// ─── CSS-in-JS helpers ────────────────────────────────────────────────────────

export const css = {
  card: {
    background: THEME.colors.surface3,
    border:     `1px solid ${THEME.colors.border}`,
    borderRadius: THEME.radius.lg,
    overflow: 'hidden' as const,
  },
  input: {
    background:   THEME.colors.bg,
    border:       `1px solid ${THEME.colors.border2}`,
    borderRadius: THEME.radius.md,
    color:        THEME.colors.ivory,
    padding:      `${THEME.spacing.sm} ${THEME.spacing.md}`,
    fontSize:     THEME.fontSizes.base,
    fontFamily:   THEME.fonts.ui,
    outline:      'none',
    width:        '100%',
    '&:focus': {
      borderColor: THEME.colors.linen,
      boxShadow: `0 0 0 2px rgba(201,169,110,0.45)`,
    },
    '&::placeholder': {
      color: THEME.colors.ash,
    },
  },
  sectionHeader: {
    padding:      `${THEME.spacing.md} ${THEME.spacing.lg}`,
    borderBottom: `1px solid ${THEME.colors.border}`,
    display:      'flex' as const,
    alignItems:   'center' as const,
    justifyContent: 'space-between' as const,
  },
  tableHeader: {
    fontSize:        THEME.fontSizes.xs,
    color:           THEME.colors.muted,
    textTransform:   'uppercase' as const,
    letterSpacing:   '0.08em',
    padding:         `${THEME.spacing.sm} ${THEME.spacing.lg}`,
    textAlign:       'left' as const,
    borderBottom:    `1px solid ${THEME.colors.ghost}`,
    fontWeight:      600,
    fontFamily:      THEME.fonts.ui,
  },
  tableCell: {
    fontSize:     THEME.fontSizes.base,
    padding:      '12px 16px',
    color:        THEME.colors.ash,
    borderBottom: `1px solid rgba(255,255,255,0.03)`,
    fontFamily:   THEME.fonts.ui,
  },
  actionBtn: {
    background:   'rgba(201,169,110,0.1)',
    border:       '1px solid rgba(201,169,110,0.3)',
    color:        THEME.colors.linen,
    padding:      '7px 16px',
    borderRadius: THEME.radius.md,
    fontSize:     THEME.fontSizes.base,
    cursor:       'pointer',
    fontFamily:   THEME.fonts.ui,
    transition:   'all 0.15s ease',
    whiteSpace:   'nowrap' as const,
    fontWeight:   500,
    '&:hover': {
      background: THEME.colors.hoverLinen,
    },
  },
  ghostBtn: {
    background:   'transparent',
    border:       `1px solid ${THEME.colors.border2}`,
    color:        THEME.colors.ash,
    padding:      '6px 14px',
    borderRadius: THEME.radius.md,
    fontSize:     THEME.fontSizes.base,
    cursor:       'pointer',
    fontFamily:   THEME.fonts.ui,
    transition:   'all 0.12s',
  },
  dangerBtn: {
    background:   'rgba(184,76,60,0.08)',
    border:       '1px solid rgba(184,76,60,0.22)',
    color:        THEME.colors.error,
    padding:      '6px 14px',
    borderRadius: THEME.radius.md,
    fontSize:     THEME.fontSizes.base,
    cursor:       'pointer',
    fontFamily:   THEME.fonts.ui,
    transition:   'all 0.12s',
  },
  focus: {
    outline:     'none',
    boxShadow:   `0 0 0 2px rgba(201,169,110,0.45)`,
    borderColor: THEME.colors.linen,
  },
} as const;

