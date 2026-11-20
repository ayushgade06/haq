// Four fictional demo cases. People, banks, shops and insurers are invented.
export const SAMPLE_AS_OF = "2026-11-20";

export const SAMPLE_STORIES = [
  {
    id: "sunita-upi",
    title: "UPI sent, never arrived",
    person: "Sunita, 52, teacher",
    hook: "₹12,000 left her account. Her brother never got it.",
    lang: "hi-Latn",
    story:
      "Maine 2 November ko PhonePe se apne bhai ko ₹12,000 bheje the. Mere Bharat National Bank account se paise kat gaye, lekin bhai ke account mein aaj tak nahi aaye. 5 November ko branch gayi thi, manager ne bola wait kijiye, aa jayega. Paise abhi tak wapas bhi nahi aaye. Kya karun?",
  },
  {
    id: "arjun-refund",
    title: "Refund stuck 40 days",
    person: "Arjun, 21, student",
    hook: "Returned headphones. The refund never came.",
    lang: "en",
    story:
      "I bought headphones on ShopKart for ₹3,499 on 28 September and returned them because they were faulty. The courier picked up the return on 11 October and the app said the refund would come in 5-7 days. It's been 40 days. I raised a complaint in the ShopKart app chat on 15 October and they keep replying that the refund is being processed. Still no money.",
  },
  {
    id: "kavya-claim",
    title: "Health claim rejected",
    person: "Kavya, 29, for her father",
    hook: "₹1,85,000 hospital bill. Claim refused.",
    lang: "en",
    story:
      "My father's health insurance claim with SafeLife Insurance was rejected on 28 October. They said his diabetes was a pre-existing condition, but he declared it when he bought the policy six years ago. The hospital bill was ₹1,85,000. I called their helpline twice and they just repeated the rejection. I haven't written to them yet.",
  },
  {
    id: "card-fraud",
    title: "Unknown debit on my card",
    person: "Farhan, 34, shop owner",
    hook: "₹40,000 spent on a site he's never heard of.",
    lang: "en",
    story:
      "On 13 November I got an SMS from Sahyog Bank that ₹40,000 was spent on my credit card on a gaming website. I never made this payment and the card was with me the whole time. My card limit is ₹2 lakh. I called customer care on 18 November, they blocked the card and said they'd look into it. Nothing in writing yet.",
  },
] as const;

export type SampleId = (typeof SAMPLE_STORIES)[number]["id"];
