# Security

Please report suspected credential exposure or security defects privately to the repository owner rather than opening a public issue containing sensitive material.

Store `CMC_API_KEY` in a local `.env.local` file or the hosting platform's secret store. Do not commit credentials, request headers, downloaded secrets, or raw provider payloads.

The application sends the key only from the server-side capture route. Generated capture receipts and decision bundles exclude the credential and the raw upstream payload.

