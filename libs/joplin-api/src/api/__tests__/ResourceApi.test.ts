import { expect, it, describe, beforeAll, afterAll, beforeEach } from 'vitest'
import { config, resourceApi } from '../..'
import { createReadStream, mkdirp, pathExists, remove, stat, writeFile } from 'fs-extra'
import { createTestResource } from './utils/CreateTestResource'
import path from 'path'
import { setupTestEnv } from '../../util/setupTestEnv'

let id: string
beforeAll(async () => {
  await setupTestEnv()
  id = (await createTestResource()).id
})
afterAll(async () => {
  await resourceApi.remove(id)
})
const tempPath = path.resolve(__dirname, '.temp')
beforeEach(async () => {
  await remove(tempPath)
  await mkdirp(tempPath)
})
it('test list', async () => {
  const res = await resourceApi.list({ fields: ['id', 'title'] })
  console.log(res)
  expect(res.items.length).toBeGreaterThan(0)
})
it('test get', async () => {
  const res = await resourceApi.get(id)
  console.log(res)
  expect(res.id).toBe(id)
})
/**
 * TODO 一个官方未修复的 bug，参考：https://github.com/laurent22/joplin/issues/4575
 */
it.skip('test get filename', async () => {
  const res = await resourceApi.get(id, ['id', 'filename'])
  console.log(res)
  expect(res.filename).not.toBe('')
})

const resourcePath = path.resolve(__dirname, './assets/resourcesByFileId.png')
it('test create', async () => {
  const title = 'image title'
  const json = await resourceApi.create({
    title,
    data: createReadStream(resourcePath),
  })
  expect(json.title).toBe(title)
})
describe('test update', () => {
  it('basic example', async () => {
    const title = `new title ${Date.now()}`
    const updateRes = await resourceApi.update({ id, title })
    expect(updateRes.title).toBe(title)
  })
  it('update file', async () => {
    const content = 'test'
    const txtPath = path.resolve(tempPath, 'test.txt')
    await writeFile(txtPath, content)
    await resourceApi.update({ id, data: createReadStream(txtPath) })
    const res = await resourceApi.fileByResourceId(id)
    expect(res.toString()).toBe(content)
  })
  it('update properties and file', async () => {
    const title = `new title ${Date.now()}`
    const content = 'test'
    const txtPath = path.resolve(tempPath, 'test.txt')
    await writeFile(txtPath, content)
    const updateRes = await resourceApi.update({ id, title, data: createReadStream(txtPath) })
    expect(updateRes.title).toBe(title)
    const res = await resourceApi.fileByResourceId(id)
    expect(res.toString()).toBe(content)
  })
  it('update file only', async () => {
    const content = 'test'
    const txtPath = path.resolve(tempPath, 'test.txt')
    await writeFile(txtPath, content)
    const { title } = await resourceApi.get(id)
    await resourceApi.update({ id, data: createReadStream(txtPath) })
    const res = await resourceApi.fileByResourceId(id)
    expect(res.toString()).toBe(content)
    expect((await resourceApi.get(id)).title).toBe(title)
  })
})
/**
 * 已知错误
 * https://discourse.joplinapp.org/t/pre-release-v2-8-is-now-available-updated-14-april/25158/10?u=rxliuli
 */
it.skip('test remove ', async () => {
  const id = (await createTestResource()).id
  await resourceApi.remove(id)
  await expect(resourceApi.get(id)).rejects.toThrowError()
})
it('test fileByResourceId', async () => {
  const res = await resourceApi.fileByResourceId(id)
  const fsPath = path.resolve(tempPath, 'resourcesByFileId.png')
  console.log(typeof res, fsPath)
  await writeFile(fsPath, res)
  expect(await pathExists(fsPath)).toBeTruthy()
})
it('test to get the size of the attachment resource', async () => {
  const id = (await createTestResource()).id
  const res = await resourceApi.get(id, ['id', 'title', 'size'])
  const stats = await stat(path.resolve(__dirname, './assets/resourcesByFileId.png'))
  expect(res.size).toEqual(stats.size)
})
