/**
 * Strips contact details, codes and account numbers from a message before it
 * leaves the browser. A pasted DM often carries the client's details (and
 * sometimes the artist's own), and none of it is needed to talk the
 * commission through.
 *
 * Every rule captures the character before its match instead of using a
 * lookbehind, which the ES2017 target doesn't allow. Replacements put it back.
 */

const EMAIL = /[a-z0-9._%+-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)*\.[a-z]{2,}/gi;

/**
 * Only these TLDs count for a bare domain like `gcash-promo.xyz`. Matching any
 * TLD would turn file names (`ref.png`) and missing spaces (`done.so`) into
 * links. Links with a scheme or `www.` are matched whatever their TLD.
 */
const BARE_DOMAIN_TLDS = [
  'com',
  'net',
  'org',
  'ph',
  'io',
  'ly',
  'me',
  'co',
  'app',
  'xyz',
  'site',
  'online',
  'link',
  'click',
  'info',
  'biz',
  'shop',
  'store',
  'top',
  'live',
  'gg',
  'tv',
  'art',
  'dev',
].join('|');

const URL_CHARS = String.raw`[^\s<>"'()\[\]]`;

const LINK = new RegExp(
  String.raw`(^|[^\w.@/-])((?:https?:\/\/|www\.)${URL_CHARS}+|(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+(?:${BARE_DOMAIN_TLDS})(?![\w-])(?:[/?#]${URL_CHARS}*)?)`,
  'gi',
);

/** 09XX XXX XXXX or +63 9XX XXX XXXX, with any grouping of single spaces or dashes. */
const PHONE = /(^|[^\d+])((?:\+?63|0)[ -]?9(?:[ -]?\d){9})(?!\d)/g;

/** Bank, card and GCash numbers: 10 or more digits, often written in groups. */
const ACCOUNT_NUMBER = /(^|\D)(\d(?:[ -]?\d){9,})(?!\d)/g;

/**
 * A 4–8 digit number counts as a code only when a code word comes shortly
 * before it. Bare numbers in a DM are usually prices or years ("budget ko
 * 1500", "Dec 2025"), and the fee is the one term Klaro most needs to read.
 */
const CODE_AFTER_CODE_WORD =
  /(\b(?:code|otp|pin|mpin|passcode|verification|tac|2fa)s?\b(?:[^\s\d]*[^\S\n]+){0,5}?[^\s\d]{0,2}?)(\d{4,8})(?!\d)/gi;

/**
 * A number pasted on a line by itself is far more likely a code than a price.
 * It matches only a line of digits, so one with a currency marker ("₱1500",
 * "PHP 1500", "1500 pesos") is never touched.
 */
const CODE_ON_OWN_LINE = /^([^\S\n]*)(\d{4,8})([^\S\n]*)$/gm;

/** A line that asks for an amount: the number under it is the answer, not a code. */
const ENDS_WITH_PRICE_WORD =
  /\b(?:fees?|budget|price|rate|payment|downpayment|dp|total|amount|how much)\W*$/i;

const CODE_WORD = /\b(?:code|otp|pin|mpin|passcode|verification|tac|2fa)s?\b/i;

/** The nearest line above `offset` that has anything on it, or '' at the top of the text. */
function previousNonEmptyLine(text: string, offset: number): string {
  const lines = text.slice(0, offset).split(/\r?\n/);

  return lines.reverse().find((line) => line.trim() !== '') ?? '';
}

/**
 * Whether a number alone on its line answers a question about money:
 * "Budget:" then "1500". A line that also names a code ("verification code for
 * payment") is not that, so the number is redacted: a missed price costs a
 * question, a missed code costs an account.
 */
function isPriceOnOwnLine(text: string, offset: number): boolean {
  const above = previousNonEmptyLine(text, offset);

  return ENDS_WITH_PRICE_WORD.test(above) && !CODE_WORD.test(above);
}

const TRAILING_PUNCTUATION = /[.,!?;:]+$/;

/** The host only: the path and query can carry tokens or tracking IDs. */
function hostOf(link: string): string {
  return link
    .replace(/^https?:\/\//i, '')
    .split(/[/?#]/)[0]
    .replace(/^[^@]*@/, '')
    .replace(/:\d*$/, '')
    .toLowerCase()
    .replace(/^www\./, '');
}

/**
 * Replaces phone numbers, emails, codes, account numbers and link paths with
 * placeholders. The order matters: emails before links (so `gmail.com` isn't
 * read as a link), phones before account numbers and codes (so a number isn't
 * split), and account numbers before codes.
 */
export function redact(text: string): string {
  return text
    .replace(EMAIL, '[email]')
    .replace(LINK, (_, before: string, link: string) => {
      // Sentence punctuation after a link isn't part of it.
      const trailing = TRAILING_PUNCTUATION.exec(link)?.[0] ?? '';
      const host = hostOf(link.slice(0, link.length - trailing.length));

      return `${before}[link: ${host}]${trailing}`;
    })
    .replace(PHONE, '$1[phone]')
    .replace(ACCOUNT_NUMBER, '$1[account number]')
    .replace(CODE_AFTER_CODE_WORD, '$1[code]')
    .replace(
      CODE_ON_OWN_LINE,
      (match, lead: string, digits: string, trail: string, offset: number, whole: string) =>
        isPriceOnOwnLine(whole, offset) ? match : `${lead}[code]${trail}`,
    );
}
