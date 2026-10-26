import { describe, expect, it } from 'vitest';

import { redact } from './redact';

describe('redact', () => {
  it('returns an empty string unchanged', () => {
    expect(redact('')).toBe('');
  });

  it('leaves a message with nothing sensitive untouched', () => {
    const message =
      'hi po! can you draw my OC? budget ko 1500, need it by Dec 2025. ₱2,500 or 1.5k is fine';

    expect(redact(message)).toBe(message);
  });

  describe('phone numbers', () => {
    it.each([
      '09171234567',
      '0917 123 4567',
      '0917-123-4567',
      '+639171234567',
      '+63 917 123 4567',
      '+63-917-123-4567',
    ])('redacts %s', (phone) => {
      expect(redact(`text me at ${phone} po`)).toBe('text me at [phone] po');
    });

    it('is checked before codes, so a number after a code word is never split', () => {
      expect(redact('my code number is 0917 123 4567')).toBe(
        'my code number is [phone]',
      );
    });

    it('keeps the punctuation that follows the number', () => {
      expect(redact('Call 09171234567.')).toBe('Call [phone].');
    });
  });

  describe('emails', () => {
    it('redacts a plain address', () => {
      expect(redact('a.b@gmail.com')).toBe('[email]');
    });

    it('redacts an address with a multi-part domain and keeps the punctuation after it', () => {
      expect(redact('Email me: Juan.Dela-Cruz+art@yahoo.com.ph!')).toBe(
        'Email me: [email]!',
      );
    });
  });

  describe('links', () => {
    it('keeps only the domain of a full URL and the punctuation after it', () => {
      expect(redact('https://bit.ly/x?y=1.')).toBe('[link: bit.ly].');
    });

    it('drops www, the port, and the path, and lowercases the host', () => {
      expect(redact('HTTPS://www.Shop.Example.COM:8080/a/b')).toBe(
        '[link: shop.example.com]',
      );
    });

    it('redacts a www link without a scheme', () => {
      expect(redact('go to www.example.com/path')).toBe(
        'go to [link: example.com]',
      );
    });

    it('redacts a bare domain with a path and query', () => {
      expect(redact('claim at gcash-promo.xyz/claim?id=99 now')).toBe(
        'claim at [link: gcash-promo.xyz] now',
      );
    });

    it('redacts short messaging links', () => {
      expect(redact('message me on t.me/artbuyer')).toBe(
        'message me on [link: t.me]',
      );
    });

    it('does not treat file names or abbreviations as links', () => {
      const message = 'see ref.png, e.g. this one';

      expect(redact(message)).toBe(message);
    });
  });

  describe('account numbers', () => {
    it.each(['1234 5678 9012 3456', '1234567890', '1234-5678-9012'])(
      'redacts %s',
      (account) => {
        expect(redact(`send to ${account} please`)).toBe(
          'send to [account number] please',
        );
      },
    );

    it('leaves a 9-digit number alone, since it is neither a code nor an account', () => {
      expect(redact('ref 123456789')).toBe('ref 123456789');
    });
  });

  describe('codes', () => {
    it.each([
      ['your code is 482913', 'your code is [code]'],
      ['OTP: 1234', 'OTP: [code]'],
      [
        "I sent a code, it's 482913, please send it back",
        "I sent a code, it's [code], please send it back",
      ],
      ['Verification code:559201', 'Verification code:[code]'],
      ['send the PIN 12345678 now', 'send the PIN [code] now'],
    ])('redacts a number after a code word: %s', (input, expected) => {
      expect(redact(input)).toBe(expected);
    });

    it('redacts a number that sits alone on its own line', () => {
      expect(redact('here:\n482913\nthanks')).toBe('here:\n[code]\nthanks');
    });

    describe('a number alone on its own line', () => {
      it('is a code when nothing says otherwise', () => {
        expect(redact('482913')).toBe('[code]');
        expect(redact('here:\n482913\nthanks')).toBe('here:\n[code]\nthanks');
      });

      it('is a code after a line that names one', () => {
        expect(redact('your code:\n482913')).toBe('your code:\n[code]');
      });

      it.each(['Budget:', 'budget', 'Fee', 'the price?', 'Rate -', 'Down payment:', 'dp:', 'Total', 'Amount:', 'how much?'])(
        'is kept after the price line "%s"',
        (above) => {
          expect(redact(`${above}\n1500`)).toBe(`${above}\n1500`);
        },
      );

      it('uses the nearest non-empty line, skipping blank ones', () => {
        expect(redact('Budget:\n\n   \n1500')).toBe('Budget:\n\n   \n1500');
        expect(redact('Budget:\nokay thanks\n1500')).toBe('Budget:\nokay thanks\n[code]');
      });

      it.each(['₱1500', 'P1500', 'PHP 1500', 'php1500', '1500 pesos'])(
        'is kept with the currency marker in "%s"',
        (line) => {
          expect(redact(`here:\n${line}`)).toBe(`here:\n${line}`);
        },
      );

      it('is a code when the line above ends in a price word but also names a code', () => {
        expect(redact('verification code for payment\n482913')).toBe(
          'verification code for payment\n[code]',
        );
      });

      it('is a code when the price word is not at the end of the line above', () => {
        expect(redact('payment sent, see below\n482913')).toBe(
          'payment sent, see below\n[code]',
        );
      });

      it('keeps the indentation and handles Windows line endings', () => {
        expect(redact('Budget:\r\n  1500')).toBe('Budget:\r\n  1500');
        expect(redact('hi\r\n  482913  ')).toBe('hi\r\n  [code]  ');
      });
    });

    it('leaves bare prices and years alone', () => {
      expect(redact('budget ko 1500')).toBe('budget ko 1500');
      expect(redact('by Dec 2025 po')).toBe('by Dec 2025 po');
    });

    it('leaves a number that is too far from the code word', () => {
      const message = 'the code of conduct says we pay 1500';

      expect(redact(message)).toBe(message);
    });

    it('leaves numbers shorter than 4 or longer than 8 digits', () => {
      expect(redact('my pin is 123')).toBe('my pin is 123');
      expect(redact('my pin is 123456789')).toBe('my pin is 123456789');
    });
  });

  it('redacts a phone number, a code and a link in the same message', () => {
    expect(
      redact(
        "Hi! Text me at 0917 123 4567. I sent you a code, it's 482913, please send it back. Pay here: https://gcash-promo.xyz/claim?id=99",
      ),
    ).toBe(
      "Hi! Text me at [phone]. I sent you a code, it's [code], please send it back. Pay here: [link: gcash-promo.xyz]",
    );
  });
});
