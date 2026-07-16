import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decodeHtmlEntities } from './htmlEntities';

test('decodes the common named entities Reddit escapes text with', () => {
  assert.equal(decodeHtmlEntities('a &gt; b'), 'a > b');
  assert.equal(decodeHtmlEntities('a &lt; b'), 'a < b');
  assert.equal(decodeHtmlEntities('a &amp; b'), 'a & b');
  assert.equal(decodeHtmlEntities('&quot;quoted&quot;'), '"quoted"');
  assert.equal(decodeHtmlEntities("it&#39;s"), "it's");
  assert.equal(decodeHtmlEntities('&apos;'), "'");
  assert.equal(decodeHtmlEntities('a&nbsp;b'), 'a b');
});

test('decodes numeric character references, decimal and hex', () => {
  assert.equal(decodeHtmlEntities('&#39;'), "'");
  assert.equal(decodeHtmlEntities('&#x27;'), "'");
  assert.equal(decodeHtmlEntities('&#8217;'), '’');
});

test('decodes multiple entities in the same string', () => {
  assert.equal(decodeHtmlEntities('this &gt; that &amp; those &lt; these'), 'this > that & those < these');
});

test('leaves plain text without entities unchanged', () => {
  assert.equal(decodeHtmlEntities('no entities here'), 'no entities here');
});

test('leaves an unknown or malformed entity as-is rather than dropping it', () => {
  assert.equal(decodeHtmlEntities('&unknown;'), '&unknown;');
  assert.equal(decodeHtmlEntities('a & b'), 'a & b');
});

test('a double-escaped entity only decodes one level, matching the raw text Reddit actually sends', () => {
  assert.equal(decodeHtmlEntities('&amp;gt;'), '&gt;');
});
