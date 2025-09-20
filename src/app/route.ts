// export const revalidate = 10 // Seems to work, but will it cache the response for everyone, or only my network?

export async function GET () {

  return new Response('coming soon', {status: 200})
}
