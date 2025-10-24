import {neon} from '@neondatabase/serverless'
import geocode from './geocode'
import {startDate, endDate} from '@/config.json'

const appId = process.env.AIRTABLE_APP_ID
const tableId = process.env.AIRTABLE_TABLE_ID
const mapId = process.env.MAP_ID || 1
const apiKey = process.env.AIRTABLE_API_KEY

type Fields = {
  "Nom de l'événement": string
  Date: string
  "Type d'événement": string
  "Hôte·sse": string[]
  "Nombre de places pour le public ": number
  "Date de l'Assemblée": string
  Courriel: string
  "Code postal": string
  "Prénom Nom": string
  "Courriel de confirmation": string
  "Nombre de participant·es": number
  "Places restantes": number
  Praxis: boolean
  Municipalité: string
  "Description action": string
  Billeterie: string
  "Action publique": string
  "Lien vers l'événement": string
}
type MultitudesEvent = {id: string, createdTime: string, fields: Fields}
type AirTableApiResponse = {records: MultitudesEvent[]}

type GeocodedEvent = MultitudesEvent & {coordinates?: [lat: number, lon: number]}
type GeocodedRecords = GeocodedEvent[]

const season = {
  start: new Date(startDate),
  end: new Date(endDate)
}

export default async function updateDb (cache: GeocodedRecords) {
  const sql = neon(`${process.env.DATABASE_URL}`)
  try {
    console.log('Updating DB')
    await sql`UPDATE maps SET update_started_at = now() WHERE id = ${mapId}`

    const response = await fetch(`https://api.airtable.com/v0/${appId}/${tableId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`
      }
    })
    const responseData: AirTableApiResponse = await response.json()
    if (!responseData.records) {
      console.error(responseData)
      return await sql`UPDATE maps SET update_failed_at = now() WHERE id = ${mapId}`
    }
    const records = responseData.records.filter((event: MultitudesEvent) => {
      if (!event.id) return false
      if (!event.fields["Date de l'Assemblée"]) return false
      if (!event.fields["Nom de l'événement"] && !event.fields["Description action"]) return false
      const eventDate = new Date(event.fields["Date de l'Assemblée"])
      if (eventDate < season.start || eventDate > season.end) return false
      return true
    })
    const newData: GeocodedRecords = records.map((event) => {
      const cached = cache.find(cachedEvent => cachedEvent.id === event.id)
      if (cached) {
        return {
          ...event,
          coordinates: cached.coordinates
        }
      }
      return event
    })

    const postalCodesToGeocode = responseData.records.reduce((acc: string[], responseEvent: MultitudesEvent) => {
      const cached = cache.find(cachedEvent => cachedEvent.id === responseEvent.id)
      if (responseEvent.fields['Code postal'] && (
        !cached || (
          cached.fields['Code postal'] !== responseEvent.fields['Code postal'] && cached.fields['Code postal']
        )
      )) {
        acc.push(responseEvent.fields['Code postal'])
      }
      return acc
    }, [])

    if (postalCodesToGeocode.length === 0) {
      await sql`UPDATE maps SET data = ${JSON.stringify(sanitizeData(newData))}, updated_at = now() WHERE id = ${mapId}`
      console.log('Update successful')
    } else {
      console.log(`Geocoding ${postalCodesToGeocode.length} postal codes`)
      const geocodedPostalCodes = await geocode(postalCodesToGeocode)
      const geocodedEvents: GeocodedRecords = newData.map((event) => {
        const idx = postalCodesToGeocode.findIndex(postalCode => postalCode === event.fields['Code postal'])
        if (idx === -1) {
          return event
        }
        const found = geocodedPostalCodes.find(geocodedPostalCode => geocodedPostalCode.query.text === event.fields['Code postal'])
        if (!found) {
          return event
        }
        const {lat, lon} = found
        return {
          ...event,
          coordinates: [lat, lon]
        }
      })

      await sql`UPDATE maps SET data = ${JSON.stringify(sanitizeData(geocodedEvents))}, updated_at = now() WHERE id = ${mapId}`
      console.log('Geocoding and update successful')
    }
  } catch (e) {
    console.error(`An unhandled error occurred: ${e}`)
    await sql`UPDATE maps SET update_failed_at = now() WHERE id = ${mapId}`
  }
}

function sanitizeData (data: GeocodedRecords) {
  return data.map(({id, fields, coordinates}) => {
    return {
      id,
      fields: {
        "Nom de l'événement": fields["Nom de l'événement"],
        "Type d'événement": fields["Type d'événement"],
        "Date de l'Assemblée": fields["Date de l'Assemblée"],
        "CourrielFourni": fields["Courriel"] ? true : false, // Keep email private
        "Places restantes": fields["Places restantes"],
        "Municipalité": fields["Municipalité"],
        "Description action": fields["Description action"],
        "Action publique": fields["Action publique"],
        "Lien vers l'événement": fields["Lien vers l'événement"],
        "Billeterie": fields["Billeterie"],
      },
      coordinates
    }
  })
}
