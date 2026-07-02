// Stickers are sent as plain text messages whose content exactly matches one
// of the strings below. MessageBubble uses isSticker() to render them as a
// large borderless sticker instead of a normal chat bubble.

export const STICKER_GROUPS: { label: string; stickers: string[] }[] = [
  {
    label: 'Reactions',
    stickers: ['🎉🎊', '🥳🎉', '👏👏👏', '🙌✨', '🔥🔥🔥', '💯', '👍👍', '🤝'],
  },
  {
    label: 'Mood',
    stickers: ['😂🤣', '😍💕', '😎🕶️', '😴💤', '😭💔', '🤔💭', '😡💢', '🙄😒'],
  },
  {
    label: 'Love',
    stickers: ['❤️❤️', '💘', '😘💋', '🥰', '💐', '🌹', '💖✨', '👩‍❤️‍👨'],
  },
  {
    label: 'Fun',
    stickers: ['🚀🌙', '🎂🎈', '☕✨', '🍕🍕', '🐶🐾', '🐱💤', '🌈☀️', '⚡👊'],
  },
];

const STICKER_SET = new Set(STICKER_GROUPS.flatMap((g) => g.stickers));

export function isSticker(text: string): boolean {
  return STICKER_SET.has(text);
}
