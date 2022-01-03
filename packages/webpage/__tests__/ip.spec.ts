/* eslint-disable jest/expect-expect */
import { getIpv4, getIpv6 } from '../common/ip'

test('get ipv4', async () => {
  const res = await getIpv4()
  console.log(res.data)
  // expect(res.data).toMatch(/\d+\.\d+\.\d+\.\d+/)
})

test('get ipv6', async () => {
  const res = await getIpv6()
  console.log(res.data)
  // expect(res.data).toMatch(/\w*:*\w*:*\w*:*\w*:*\w*:*\w*:\w*:\w/)
})
