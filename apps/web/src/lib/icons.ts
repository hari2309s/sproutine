// Material Symbols Rounded, self-hosted in public/fonts with only the glyphs
// listed here (the full font is several MB). To add an icon: add its name to
// ICONS, then run `pnpm --filter @sproutine/web icons:sync`. The type makes an
// unlisted name a compile error, and a unit test fails if the font is stale.
export const ICONS = [
  'add',
  'arrow_forward',
  'arrow_upward',
  'calendar_month',
  'calendar_view_week',
  'call',
  'chat_bubble',
  'check',
  'check_circle',
  'chevron_right',
  'close',
  'coffee',
  'contrast',
  'cookie',
  'dark_mode',
  'delete',
  'download',
  'eco',
  'error',
  'graphic_eq',
  'light_mode',
  'logout',
  'mail',
  'mic',
  'nutrition',
  'play_arrow',
  'refresh',
  'restaurant',
  'shopping_basket',
  'spa',
  'stop',
  'thumb_down',
  'thumb_up',
  'tune',
  'volume_off',
  'volume_up',
  'water_drop',
  'wb_sunny',
] as const

export type IconName = (typeof ICONS)[number]

// Source for scripts/sync-icons.ts. Google Fonts requires icon_names sorted.
export const ICON_FONT_URL = `https://fonts.googleapis.com/css2?family=Material+Symbols+Rounded:opsz,wght,FILL,GRAD@20..48,400..600,0..1,0&icon_names=${[...ICONS].sort().join(',')}&display=block`
