/* AN AI STILL SAYS SO INSIDE THE FILE, TOO (v103).
 *
 * The claims standard (section K) bars dropping provenance marks. The demo
 * videos carry an "AI-generated" comment in their metadata; their stills are
 * cut with ffmpeg, which writes none, so this adds a JPEG comment segment
 * right after the start-of-image marker. Idempotent: a file that already
 * carries the comment is left alone.
 *   node tools/tag_ai_jpg.js <file.jpg> "<comment>"
 */
'use strict';
const fs = require('fs');
const [file, comment] = process.argv.slice(2);
if (!file || !comment) { console.error('usage: node tools/tag_ai_jpg.js <file.jpg> "<comment>"'); process.exit(1); }
const buf = fs.readFileSync(file);
if (buf[0] !== 0xff || buf[1] !== 0xd8) { console.error(file + ' is not a JPEG'); process.exit(1); }
if (buf.includes(Buffer.from(comment, 'utf8'))) { console.log('already tagged: ' + file); process.exit(0); }
const text = Buffer.from(comment, 'utf8');
if (text.length > 65533) { console.error('comment too long'); process.exit(1); }
const seg = Buffer.alloc(4 + text.length);
seg[0] = 0xff; seg[1] = 0xfe; seg.writeUInt16BE(text.length + 2, 2); text.copy(seg, 4);
fs.writeFileSync(file, Buffer.concat([buf.subarray(0, 2), seg, buf.subarray(2)]));
console.log('tagged: ' + file);
