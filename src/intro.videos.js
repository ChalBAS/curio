// © 2026 Qpio. All rights reserved. Not covered by the MIT LICENSE.
// Terms of use: /CONTENT-LICENCE.md · Machine use reserved: /ai.txt
//
// QUICK-FIRE INTRO VIDEOS (founder, 28 Sep 2026: "in the quick fire in the category, is a
// video, with subtitles to introduce the general topic, and sign languages when possible").
// One short film per category and language. The scripts, subtitles and shot lists live in
// curio-hq 03-Engine/question-intelligence/content/intro-videos/.
//
// EMPTY UNTIL A FILM EXISTS: a category with no entry here shows nothing - no empty button,
// no "coming soon". Add a film only once it is on Qpio's channel and approved by the founder.
//
// Shape, per category key of app.js CATS ("History", "Science", ...), per language:
//   { id: "<11-char YouTube id>", title: "...", seconds: 75,
//     cc: true,                       // subtitles are on the video: the player turns them on
//     ai: true,                       // made with AI: the "◆ AI-generated video" mark shows
//     signed: { id: "<YouTube id>", sl: "BSL" } }   // optional: the same film with a signer
window.CURIO_INTRO_VIDEOS = {};
