/**
 * Word corpus + content gating (PROJECT.md §6.3).
 *
 * The CONTENT model is key-gated, not length-banded: every item is drawn only
 * from keys unlocked so far (data/curriculum.ts). Each word maps implicitly to
 * the FIRST level whose unlocked letter-set contains all its letters — computed
 * live by `wordsForLevel`, never hand-assigned, so it can't drift from the key
 * order.
 *
 * ~400 high-frequency, age-5+ words (Fry 300 / Dolch sight words), all
 * wholesome. Monster/Dragon/Dino levels are themed by CUTENESS, not menace —
 * no scary or violent words anywhere. Phrases (space-bar practice) and
 * punctuation items are gated the same way and only surface once their keys
 * unlock.
 */
import {
  lettersUnlockedThrough,
  punctuationUnlockedThrough,
  phrasesUnlocked,
} from './curriculum';

/**
 * The common-word corpus (~400). Kept lowercase; capitalization is applied at
 * draw time on capital levels (Shift practice). Grouped only for readability —
 * order carries no meaning (the key gate decides availability).
 */
export const WORD_CORPUS: readonly string[] = [
  // very high frequency function/sight words
  'a', 'i', 'an', 'and', 'are', 'as', 'at', 'am', 'be', 'by', 'do', 'go', 'he',
  'her', 'here', 'him', 'his', 'how', 'if', 'in', 'is', 'it', 'its', 'me', 'my',
  'no', 'not', 'now', 'of', 'off', 'oh', 'old', 'on', 'once', 'one', 'only',
  'or', 'our', 'out', 'over', 'own', 'she', 'so', 'that', 'the', 'their', 'them',
  'then', 'there', 'these', 'they', 'this', 'to', 'too', 'under', 'until', 'up',
  'us', 'use', 'very', 'was', 'we', 'well', 'went', 'were', 'what', 'when',
  'where', 'which', 'while', 'who', 'why', 'will', 'with', 'would', 'yes', 'you',
  'your', 'about', 'after', 'again', 'all', 'also', 'always', 'any', 'around',
  'away', 'back', 'both', 'came', 'can', 'come', 'could', 'did', 'down', 'each',
  'end', 'even', 'ever', 'every', 'few', 'find', 'fine', 'first', 'for', 'found',
  'from', 'get', 'give', 'good', 'got', 'great', 'had', 'has', 'have', 'help',
  'hold', 'hope', 'just', 'keep', 'kept', 'kind', 'know', 'land', 'last', 'late',
  'left', 'let', 'like', 'line', 'little', 'live', 'long', 'look', 'lot', 'love',
  'made', 'make', 'many', 'may', 'meet', 'mine', 'more', 'most', 'move', 'much',
  'must', 'name', 'near', 'need', 'never', 'new', 'next', 'nice', 'open', 'other',
  'page', 'part', 'pass', 'past', 'pick', 'place', 'play', 'please', 'pull',
  'put', 'quick', 'quiet', 'quit', 'ran', 'read', 'rest', 'ride', 'round', 'run',
  'said', 'same', 'sat', 'saw', 'say', 'see', 'seen', 'seven', 'show', 'sing',
  'sit', 'six', 'sleep', 'slow', 'small', 'some', 'soon', 'sort', 'stay', 'stop',
  'take', 'talk', 'tell', 'ten', 'than', 'thank', 'thing', 'think', 'those',
  'three', 'time', 'tiny', 'today', 'took', 'top', 'try', 'turn', 'two', 'walk',
  'want', 'warm', 'wash', 'watch', 'way', 'week', 'went', 'wet', 'wing', 'wish',
  'word', 'work', 'world', 'yard', 'year',
  // nouns / everyday, age-appropriate & positive
  'air', 'apple', 'baby', 'ball', 'band', 'bath', 'bed', 'bee', 'bell', 'best',
  'big', 'bird', 'blue', 'boat', 'body', 'book', 'box', 'boy', 'bread', 'bright',
  'bring', 'brother', 'bug', 'bus', 'cake', 'candy', 'car', 'card', 'cat', 'city',
  'clean', 'cloud', 'club', 'cold', 'cook', 'cup', 'cute', 'dad', 'dance', 'day',
  'dear', 'deer', 'dig', 'dog', 'door', 'dragon', 'dream', 'drink', 'dry', 'duck',
  'ear', 'early', 'eat', 'egg', 'eight', 'eye', 'face', 'fall', 'family', 'fan',
  'far', 'fast', 'feel', 'feet', 'fell', 'field', 'fire', 'fish', 'five', 'fix',
  'fly', 'food', 'four', 'fox', 'friend', 'frog', 'fun', 'funny', 'game', 'garden',
  'gave', 'girl', 'glad', 'grass', 'green', 'grow', 'hair', 'half', 'hall', 'hand',
  'happy', 'hard', 'hat', 'head', 'hear', 'heart', 'hen', 'high', 'hill', 'home',
  'hop', 'horse', 'hot', 'house', 'hug', 'idea', 'jam', 'jar', 'joy', 'jump',
  'kid', 'king', 'kiss', 'kite', 'lady', 'leaf', 'leg', 'lie', 'life', 'light',
  'lion', 'mad', 'mail', 'main', 'man', 'map', 'men', 'milk', 'mom', 'money',
  'moon', 'morning', 'mouse', 'nap', 'neck', 'nest', 'night', 'nose', 'nut',
  'orange', 'paint', 'pan', 'park', 'party', 'pea', 'pen', 'pet', 'pig', 'pink',
  'plant', 'pond', 'pony', 'pretty', 'queen', 'rabbit', 'rain', 'red', 'river',
  'road', 'rock', 'room', 'rose', 'sad', 'sail', 'sand', 'sea', 'seed', 'sheep',
  'shell', 'ship', 'shoe', 'shop', 'shy', 'sister', 'sky', 'smile', 'snail',
  'snow', 'song', 'spring', 'star', 'story', 'summer', 'sun', 'sunny', 'sweet',
  'swim', 'table', 'tail', 'tall', 'teeth', 'toy', 'tree', 'turtle', 'wave',
  'wheel', 'white', 'wind', 'winter', 'wood', 'yellow', 'zebra', 'zip', 'zoo',
];

/**
 * Short, wholesome 2-word phrases — SPACE-BAR practice (§6.3). Gated by letters
 * AND only surfaced once phrases unlock (L10). Kept to easy, high-frequency
 * combinations a beginner can chunk.
 */
export const PHRASES: readonly string[] = [
  'i can', 'i see', 'me too', 'he is', 'she is', 'we did', 'to the', 'in the',
  'on the', 'and me', 'my cat', 'my day', 'a star', 'the sun', 'big hug', 'so fun',
  'be kind', 'so cute', 'good dog', 'the fox', 'new day', 'play time', 'all day',
  'have fun', 'you did', 'we win', 'best day', 'so happy', 'good job', 'well done',
  'high five', 'love you', 'you did it', 'nice work', 'run fast', 'jump up',
];

/**
 * Punctuated items, each needing specific punctuation keys unlocked (L21+). The
 * apostrophe items (L22) teach contractions; the '!'/'?' items (L23) teach
 * sentence tone. Gated by letters AND the punctuation chars they contain.
 */
export const PUNCT_ITEMS: readonly string[] = [
  // period / comma (L21)
  'good job.', 'well done.', 'the end.', 'me, too.', 'yes, please.',
  // apostrophe (L22) — contractions
  "don't", "can't", "i'm", "it's", "let's", "that's", "we'll", "you're", "i'll",
  // exclamation / question (L23)
  'yes!', 'wow!', 'hooray!', 'great job!', 'who?', 'why?', 'ready?', 'all done!',
];

/** Lowercased alphabetic characters of a string (ignores space & punctuation). */
function lettersOf(s: string): string[] {
  return [...s.toLowerCase()].filter((ch) => ch >= 'a' && ch <= 'z');
}
/** Non-letter, non-space characters (the punctuation a string requires). */
function punctOf(s: string): string[] {
  return [...s].filter((ch) => ch !== ' ' && !(ch >= 'a' && ch <= 'z') && !(ch >= 'A' && ch <= 'Z'));
}

/** True if every letter of `s` is unlocked through `level`. */
function lettersTypeable(s: string, level: number): boolean {
  const unlocked = lettersUnlockedThrough(level);
  const letters = lettersOf(s);
  return letters.length > 0 && letters.every((ch) => unlocked.has(ch));
}

/** Plain corpus words typeable at `level` (letters ⊆ unlocked). */
export function wordsForLevel(level: number): string[] {
  return WORD_CORPUS.filter((w) => lettersTypeable(w, level));
}

/** Phrases typeable at `level` — only once phrases (and space) unlock. */
export function phrasesForLevel(level: number): string[] {
  if (!phrasesUnlocked(level)) return [];
  return PHRASES.filter((p) => lettersTypeable(p, level));
}

/** Punctuated items typeable at `level` — letters AND punctuation both unlocked. */
export function punctItemsForLevel(level: number): string[] {
  const punct = punctuationUnlockedThrough(level);
  if (punct.size === 0) return [];
  return PUNCT_ITEMS.filter(
    (item) => lettersTypeable(item, level) && punctOf(item).every((ch) => punct.has(ch)),
  );
}

/**
 * How many DISTINCT corpus words FIRST become typeable at `level` (coverage
 * metric for the curriculum table / tests). New = typeable now but not at
 * level-1.
 */
export function newlyTypeableCount(level: number): number {
  if (level <= 1) return wordsForLevel(level).length;
  const now = new Set(wordsForLevel(level));
  for (const w of wordsForLevel(level - 1)) now.delete(w);
  return now.size;
}
