/**
 * Example client messages for the first-run state. Both are made up: the first
 * has the marks of an overpayment scam, the second is an ordinary request. The
 * overpayment one carries an email address and a phone number on purpose, so
 * the artist can see redaction happen before choosing to send.
 */

export type ExampleMessage = {
  id: 'overpayment' | 'genuine';
  /** What the button says. */
  label: string;
  text: string;
};

export const EXAMPLE_MESSAGES: readonly ExampleMessage[] = [
  {
    id: 'overpayment',
    label: 'A message with warning signs',
    text: "Hello dear, I saw your amazing work and I'd love a portrait of my late dog as a surprise for my daughter's birthday. Money is not a problem. I'll send a cheque for $2,000 for your $1,200 portrait and you can refund the difference to my shipper. I'm deaf so please reply by email only: buyer.example@example.com or text 0917 000 0000. I need it within 3 days.",
  },
  {
    id: 'genuine',
    label: 'An ordinary request',
    text: "hi po! can you do a half-body digital portrait of my OC? she has pink hair and a green jacket, ref sheet attached. budget ko ₱1500, and I'd like it by Dec 15 for my friend's birthday. thank you po!",
  },
];
