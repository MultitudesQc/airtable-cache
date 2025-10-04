This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app). It implements a single API endpoint that provides data from the [Airtable API](https://airtable.com/api) and caches the results in a NeonDB database. When updating the data, it also geocodes any new or changed postal codes and adds the found coordinates to the database.

## Development

```bash
npm run dev
```

## Deployment

Deployment is handled by [Vercel](https://vercel.com), so simply pushing to the `main` branch will deploy the app to the live site.

## Environment Variables

Local development uses the `.env.local` file, which is ignored by Git. You can make your own based on the `env.example` file although it will be easier to let Vercel generate most of the file for you and add the following manually afterwards:

- AIRTABLE_API_KEY
- AIRTABLE_APP_ID
- AIRTABLE_TABLE_ID
- GEOAPIFY_BATCH_GEOCODING_URL
- GEOAPIFY_API_KEY
- MAP_ID
