import {neon} from '@neondatabase/serverless'
import updateDb from '../updateDb'
import config from '@/config.json'

export const revalidate = config.maxAgeInSeconds // seconds

const mapId = process.env.MAP_ID || '1'

export async function GET () {
  const sql = neon(`${process.env.DATABASE_URL}`)
  const [map] = await sql`SELECT * FROM maps WHERE id = ${mapId}`
  const {data, updated_at, update_started_at, update_failed_at} = map
  const now = new Date()
  const age = (now.getTime() - updated_at.getTime()) / 1000
  const stale = age > revalidate
  const updating = update_started_at > updated_at && (update_failed_at === null || update_started_at > update_failed_at)

  if (stale && !updating) {
    updateDb(data) // Intentionally not awaited to run in background
  }
  return new Response(
    JSON.stringify({map, stale}),
    {status: 200, headers: {'Content-Type': 'application/json'}}
  )
}
