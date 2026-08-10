# THE RELEASE TEST — play it, don't review it

**Why this exists.** Between 8 and 10 August the CEO found, by playing the app on
his own phone: a truncated flag, a city card that blanked the page, a repeated
question, an unreadable difficulty label, a notification that never arrived, and
a missing Home button. The AI council — four to eighteen agents per review —
found none of them. That is not a council failure of intelligence. It is a
failure of *method*: the council read documents and code, and nobody played the
app.

Reviewing code answers "is this correct?". Playing the app answers "is this
usable?". They are different questions and only the second one ships.

**The rule from now on: no release is proposed until every line below has been
executed on a real device profile, by an agent driving the actual UI — not by
reading the diff, not by querying the DOM for element existence.**

## Before every release

### 1 · The first sixty seconds — clean profile, 375×812
- [ ] Clear storage, clear caches, unregister the service worker. Load cold.
- [ ] Walk onboarding end to end. Back works from every screen. No placeholder text.
- [ ] Play the daily challenge to the result screen without touching a dev tool.
- [ ] From the result screen: can you get Home in one tap? Can you reach a
      "go further" destination? Does every link open something real?

### 2 · The repeat test — the promise most easily broken
- [ ] Play the same quick-fire topic **three times in a row**. Collect every
      question text + image. Zero may repeat.
- [ ] Play until the topic is exhausted. The "cleared this topic" card must
      appear — never a silent repeat, never an empty screen.
- [ ] Play the daily, then the same topic in quick-fire. No overlap.

### 3 · Both languages, not just English
- [ ] Set `curio.lang = "fr"` and repeat §1. Every screen, every card, every
      button. Any English string that appears is a defect, including inside
      data files — city packs, alt text, pronunciation guides.
- [ ] French typography: non-breaking space before `? ! : ;`.

### 4 · Pictures
- [ ] Every image question: the picture is **whole**. Nothing cropped that
      carries meaning — a flag missing a stripe is a wrong answer.
- [ ] No grey letterbox around an image that does not fill its frame.
- [ ] Every image has alt text that describes it **without giving the answer**.

### 5 · Layout, measured not eyeballed
- [ ] `document.documentElement.scrollWidth === clientWidth` on every screen.
- [ ] No card's children extend past the card's right edge.
- [ ] No text clipped mid-sentence: `scrollHeight <= clientHeight + 1` on every
      hook, fact and blurb.
- [ ] Repeat at 375, 768 and 1280 wide.

### 6 · The console
- [ ] Zero errors, on every screen visited above.

### 7 · The release recipe
- [ ] `?v=N` bumped on **every** asset in `index.html` AND `sw.js`, cache name too.
- [ ] `py tools/check_i18n.py --strict` green.
- [ ] `node --check` on every changed `.js`.
- [ ] `py tools/check_sources.py` green if the bank changed.
- [ ] After push: fetch the live URL and confirm the new version is serving.

## What the council is still for

Documents, architecture, strategy, adversarial fact-checking of content, and
attacking a business model. It is genuinely good at those — the 18-agent hook
audit caught 47 overstated facts and a French sentence that had become false in
translation. Keep using it there.

Just never again mistake a review of the code for a test of the product.
