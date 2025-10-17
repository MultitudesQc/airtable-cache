const geocodingApiKey = process.env.GEOAPIFY_API_KEY
const batchGeocodingApiUrl = process.env.GEOAPIFY_BATCH_GEOCODING_URL
const msPerAddress = parseInt(process.env.MS_PER_ADDRESS || '250') // a quarter of a second
const maxAttempts = parseInt(process.env.MAX_ATTEMPTS || '10')

type BatchGeocodingResponse = {
  "query": {
    "text": string
    "parsed": {
        "housenumber": string
        "street": string
        "postcode": string
        "city": string
        "state": string
        "country": string
        "expected_type": string
    }
  },
  "datasource": {
      "sourcename": string
      "attribution": string
      "license": string
      "url": string
  },
  "housenumber": string
  "street": string
  "suburb": string
  "city": string
  "county": string
  "state": string
  "postcode": string
  "country": string
  "country_code": string
  "lon": number
  "lat": number
  "formatted": string
  "address_line1": string
  "address_line2": string
  "state_code": string
  "result_type": string
  "rank": {
      "importance": number
      "popularity": number
      "confidence": number
      "confidence_city_level": number
      "confidence_street_level": number
      "match_type": string
  },
  "place_id": string
}[]

export default async function geocode (addresses: string[]) {
  const nbAddresses = addresses.length
  const response = await fetch(`${batchGeocodingApiUrl}?lang=fr&filter=countrycode:ca&apiKey=${geocodingApiKey}`, {
    method: 'POST',
    headers: {
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(addresses)
  })
  if (response.status !== 202) {
    throw new Error(`Geocoding API returned status ${response.status}`)
  }
  const { id } = await response.json()
  
  try {
    const result = await getAsyncResult(`${batchGeocodingApiUrl}?id=${id}&apiKey=${geocodingApiKey}&format=json`, nbAddresses, maxAttempts)
    return result
  } catch (error) {
    throw new Error(`Geocoding failed: ${JSON.stringify(error)}`)
  }
}

function getAsyncResult (url: string, nbAddresses: number, maxAttempts: number) {
  const timeout = msPerAddress * nbAddresses
  return new Promise<BatchGeocodingResponse>((resolve, reject) => {
    setTimeout(async () => {
      await repeatUntilSuccess(resolve, reject)
    }, timeout);
  });

  async function repeatUntilSuccess(resolve: (value: BatchGeocodingResponse) => void, reject: (reason: string | unknown) => void, attempt: number = 1) {
    try {
      console.log(`Fetching batch geocoding result for ${nbAddresses} addresses: attempt #${attempt}`)
      const response = await fetch(url)
      const body = await response.json()
      if (response.status === 200) {
        resolve(body);
      } else if (attempt > maxAttempts) {
        reject(`Max amount of attempts (${maxAttempts}) reached`);
      } else if (response.status === 202) {
        setTimeout(() => {
          repeatUntilSuccess(resolve, reject, attempt + 1)
        }, timeout);
      } else {
        reject(body)
      }
    } catch (error: unknown) {
      reject(error)
    }
  }
}
