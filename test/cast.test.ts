import assert from 'node:assert/strict'
import test from 'node:test'
import { castTest } from '../src/server/cast'

test('DLNA SSDP headers are parsed case-insensitively', () => {
  const headers = castTest.parseHeaders('HTTP/1.1 200 OK\r\nLOCATION: http://127.0.0.1/device.xml\r\nUSN: uuid:test\r\n\r\n')
  assert.equal(headers.location, 'http://127.0.0.1/device.xml')
  assert.equal(headers.usn, 'uuid:test')
})

test('DLNA SOAP values are XML escaped', () => {
  assert.equal(castTest.soapEscape(`A&B <test> "quote"`), 'A&amp;B &lt;test&gt; &quot;quote&quot;')
})
