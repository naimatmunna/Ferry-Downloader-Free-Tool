import { test } from 'node:test';
import assert from 'node:assert/strict';
import { classifyIp, isIpLiteral, isPublicIp } from '../../src/security/ip.js';

test('blocks every non-public IPv4 range', () => {
  for (const ip of [
    '0.0.0.0', '0.1.2.3', '10.0.0.1', '10.255.255.255', '100.64.0.1', '100.127.255.254', '127.0.0.1', '127.255.255.255',
    '169.254.169.254', '172.16.0.1', '172.31.255.255', '192.0.0.1', '192.0.2.1', '192.88.99.1', '192.168.1.1',
    '198.18.0.1', '198.19.255.255', '198.51.100.7', '203.0.113.9', '224.0.0.1', '239.255.255.250', '240.0.0.1', '255.255.255.255',
  ]) {
    assert.equal(isPublicIp(ip), false, ip);
  }
});

test('allows public IPv4', () => {
  for (const ip of ['8.8.8.8', '1.1.1.1', '93.184.216.34', '172.32.0.1', '100.128.0.1', '192.169.0.1', '11.0.0.1']) {
    assert.equal(isPublicIp(ip), true, ip);
  }
});

test('blocks non-public IPv6 including IPv4-embedding ranges', () => {
  for (const ip of [
    '::', '::1', '[::1]', 'fe80::1', 'fc00::1', 'fd12:3456::1', 'ff02::1', 'fec0::1',
    '::ffff:127.0.0.1', '::ffff:10.0.0.1', '::ffff:169.254.169.254', // IPv4-mapped
    '64:ff9b::7f00:1', // NAT64 → 127.0.0.1
    '2002:7f00:1::1', // 6to4 embedding 127.0.0.1
    '2001:0:4136:e378:8000:63bf:3fff:fdd2', // Teredo
    '2001:db8::1', '100::1', '3fff::1',
    'fe80::1%eth0',
  ]) {
    assert.equal(isPublicIp(ip), false, ip);
  }
});

test('allows public IPv6 and public IPv4-mapped', () => {
  assert.equal(isPublicIp('2606:4700:4700::1111'), true);
  assert.equal(isPublicIp('2a00:1450:4001:81b::200e'), true);
  assert.equal(isPublicIp('::ffff:8.8.8.8'), true);
});

test('rejects non-canonical and invalid IPv4 literals', () => {
  assert.equal(classifyIp('127.1').public, false);
  assert.equal(classifyIp('0x7f.0.0.1').public, false);
  assert.equal(classifyIp('2130706433').public, false);
  assert.equal(classifyIp('not-an-ip').kind, 'invalid');
  assert.equal(classifyIp('').kind, 'invalid');
});

test('isIpLiteral', () => {
  assert.equal(isIpLiteral('1.2.3.4'), true);
  assert.equal(isIpLiteral('[2606:4700::1]'), true);
  assert.equal(isIpLiteral('example.com'), false);
  assert.equal(isIpLiteral('127.1'), false);
});
