// node tests/rss.check.ts — RSS feed builder.
import assert from 'node:assert/strict';
import {rssXml} from '../packages/ui/src/rss.ts';

const base={address:'',region_name:'서울 종로구',conditions:{},quality_score:50,updated_at:'2026-10-07T00:00:00+09:00'};
const items:any[]=[
  {...base,id:'old',name:'옛 장소',kind:'place',indexable:true,description:'설명',source_modified_at:'20260101090000'},
  {...base,id:'new',name:'새 축제 <특별> & "공연"',kind:'festival',indexable:true,description:'가'.repeat(250),source_modified_at:'20261005120000'},
  {...base,id:'hidden',name:'색인 제외',kind:'place',indexable:false,description:'설명',source_modified_at:'20261006120000'},
];
const xml=rssXml(items,'https://trip.guidejung.com');
assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>'));
assert.equal((xml.match(/<item>/g)||[]).length,2);                       // non-indexable excluded
assert.ok(xml.indexOf('/festival/new')<xml.indexOf('/place/old'));         // newest first
assert.ok(xml.includes('새 축제 &lt;특별&gt; &amp; &quot;공연&quot;'));      // escaped
assert.ok(xml.includes('<pubDate>Mon, 05 Oct 2026 03:00:00 GMT</pubDate>')); // KST → GMT
assert.ok(xml.includes('…</description>'));                               // long text trimmed
assert.equal((rssXml(items,'https://x',1).match(/<item>/g)||[]).length,1);
console.log('rss checks passed');
