export async function GET() {
  return Response.json(
    {
      status: 'ok',
      service: 'post-disaster-alert',
      timestamp: new Date().toISOString(),
    },
    { status: 200 }
  );
}
